use super::*;
use std::ffi::OsStr;
use std::path::{Component, Path};

pub fn scan_fixture_with_io<I: ReadOnlyIo, O: ScanObserver>(
    run: &FixtureRun,
    options: &ScanOptions,
    cancel: &CancelToken,
    io: &I,
    observer: &O,
) -> Result<ScanFacts, ScanError> {
    ScanOptions::new(
        options.max_depth,
        options.max_entries,
        options.max_dir_entries,
    )?;
    let mut walker = Walker {
        options,
        cancel,
        io,
        observer,
        visited: 0,
        recorded: 0,
    };
    let mut scopes = Vec::new();
    let mut stopped: Option<Stop> = None;
    for scope in &run.scopes {
        let mut facts = ScopeFacts {
            scope_id: scope.id.clone(),
            relative_root: scope.relative.clone(),
            coverage: Coverage::Complete,
            visited_entries: 0,
            entries: Vec::new(),
            issues: Vec::new(),
        };
        if let Some(stop) = &stopped {
            stop.apply(&mut facts, None);
        } else if cancel.is_cancelled() {
            let stop = Stop::cancelled();
            stop.apply(&mut facts, None);
            stopped = Some(stop);
        } else {
            let root = ScanNodePath {
                absolute: run.root.join(scope.relative.as_str()),
                scope_id: scope.id.clone(),
                relative: RelativePath::new("").expect("empty relative path"),
                run_relative: scope.relative.clone(),
                guards: Arc::clone(&scope.guards),
            };
            // Root inspection is an operation, not an entry or an observer event.
            match io.inspect(&root) {
                Ok(metadata) if metadata.kind == EntryKind::Directory => {
                    stopped = walker.directory(&root, 0, &mut facts);
                }
                Ok(_) => {
                    stopped = walker.io_fault(
                        IoFault {
                            kind: IoFaultKind::RootChanged,
                            injected: false,
                        },
                        &root,
                        IssueOperation::RootGuard,
                        &mut facts,
                    );
                }
                Err(fault) => {
                    stopped = walker.io_fault(fault, &root, IssueOperation::Inspect, &mut facts);
                }
            }
        }
        scopes.push(facts);
    }
    let status = if scopes.iter().any(|s| s.coverage == Coverage::Cancelled) {
        ScanStatus::Cancelled
    } else if scopes.iter().any(|s| s.coverage == Coverage::Partial) {
        ScanStatus::Partial
    } else {
        ScanStatus::Completed
    };
    Ok(ScanFacts {
        facts_version: "water.scan-lab.v1",
        run_id: run.run_id.clone(),
        case_id: run.case_id.clone(),
        status,
        visited_entries: walker.visited,
        recorded_entries: walker.recorded,
        scopes,
    })
}

struct Stop {
    code: IssueCode,
    origin: IssueOrigin,
    operation: IssueOperation,
    coverage: Coverage,
}
impl Stop {
    fn cancelled() -> Self {
        Self {
            code: IssueCode::Cancelled,
            origin: IssueOrigin::Control,
            operation: IssueOperation::Cancel,
            coverage: Coverage::Cancelled,
        }
    }
    fn budget() -> Self {
        Self {
            code: IssueCode::EntryLimit,
            origin: IssueOrigin::Policy,
            operation: IssueOperation::Budget,
            coverage: Coverage::Partial,
        }
    }
    fn apply(&self, scope: &mut ScopeFacts, path: Option<RelativePath>) {
        scope.coverage = self.coverage;
        scope.issues.push(FactIssue {
            code: self.code,
            relative_path: path,
            origin: self.origin.clone(),
            operation: self.operation.clone(),
        });
    }
}

struct Walker<'a, I, O> {
    options: &'a ScanOptions,
    cancel: &'a CancelToken,
    io: &'a I,
    observer: &'a O,
    visited: u32,
    recorded: u32,
}
fn policy(scope: &mut ScopeFacts, node: &ScanNodePath, code: IssueCode, operation: IssueOperation) {
    scope.coverage = Coverage::Partial;
    scope.issues.push(FactIssue {
        code,
        relative_path: Some(node.relative.clone()),
        origin: IssueOrigin::Policy,
        operation,
    });
}

impl<I: ReadOnlyIo, O: ScanObserver> Walker<'_, I, O> {
    fn cancellation(&self, node: &ScanNodePath, scope: &mut ScopeFacts) -> Option<Stop> {
        if self.cancel.is_cancelled() {
            let stop = Stop::cancelled();
            stop.apply(scope, Some(node.relative.clone()));
            Some(stop)
        } else {
            None
        }
    }

    fn io_fault(
        &self,
        fault: IoFault,
        node: &ScanNodePath,
        operation: IssueOperation,
        scope: &mut ScopeFacts,
    ) -> Option<Stop> {
        let origin = if fault.injected {
            IssueOrigin::Injected
        } else if fault.kind == IoFaultKind::DirectoryLimit {
            IssueOrigin::Policy
        } else {
            IssueOrigin::Native
        };
        if fault.kind == IoFaultKind::RootChanged {
            let stop = Stop {
                code: IssueCode::RootChanged,
                origin,
                operation: IssueOperation::RootGuard,
                coverage: Coverage::Partial,
            };
            stop.apply(scope, Some(node.relative.clone()));
            return Some(stop);
        }
        let code = match fault.kind {
            IoFaultKind::PermissionDenied => IssueCode::PermissionDenied,
            IoFaultKind::DirectoryLimit => IssueCode::EntryLimit,
            _ => IssueCode::IoError,
        };
        scope.coverage = Coverage::Partial;
        scope.issues.push(FactIssue {
            code,
            relative_path: Some(node.relative.clone()),
            origin,
            operation,
        });
        None
    }

    fn directory(
        &mut self,
        node: &ScanNodePath,
        depth: u32,
        scope: &mut ScopeFacts,
    ) -> Option<Stop> {
        if let Some(stop) = self.cancellation(node, scope) {
            return Some(stop);
        }
        if depth == self.options.max_depth {
            policy(scope, node, IssueCode::DepthLimit, IssueOperation::Budget);
            return None;
        }
        let limit = self.options.max_dir_entries as usize;
        let mut names = match self.io.list_names(node, limit) {
            Ok(names) => names,
            Err(fault) => return self.io_fault(fault, node, IssueOperation::ReadDir, scope),
        };
        // Adapters are trusted but batches are still bounded and unambiguous.
        if names.len() > limit {
            policy(scope, node, IssueCode::EntryLimit, IssueOperation::ReadDir);
            return None;
        }
        names.sort_by(|a, b| a.as_encoded_bytes().cmp(b.as_encoded_bytes()));
        if names.windows(2).any(|pair| pair[0] == pair[1]) {
            policy(scope, node, IssueCode::IoError, IssueOperation::ReadDir);
            return None;
        }
        for name in names {
            if let Some(stop) = self.cancellation(node, scope) {
                return Some(stop);
            }
            // Only a pending candidate triggers the global limit. Exactly finishing a
            // scope does not invent a missing entry or downgrade its coverage.
            if self.visited == self.options.max_entries {
                let stop = Stop::budget();
                stop.apply(scope, Some(node.relative.clone()));
                return Some(stop);
            }
            self.visited += 1;
            scope.visited_entries += 1;
            let Some(child) = child(node, &name) else {
                policy(
                    scope,
                    node,
                    IssueCode::PathUnrepresentable,
                    IssueOperation::Inspect,
                );
                continue;
            };
            let metadata = match self.io.inspect(&child) {
                Ok(metadata) => metadata,
                Err(fault) => {
                    if let Some(stop) = self.io_fault(fault, &child, IssueOperation::Inspect, scope)
                    {
                        return Some(stop);
                    }
                    continue;
                }
            };
            let directory = metadata.kind == EntryKind::Directory;
            scope.entries.push(EntryFact {
                relative_path: child.relative.clone(),
                depth: depth + 1,
                kind: metadata.kind,
                logical_bytes: metadata.logical_bytes,
                allocated_bytes: None,
                identity: metadata.identity,
            });
            self.recorded += 1;
            self.observer.on_entry(&ScanProgress {
                scope_id: child.scope_id.clone(),
                relative_path: child.relative.clone(),
                visited_entries: self.visited,
                recorded_entries: self.recorded,
            });
            if directory && let Some(stop) = self.directory(&child, depth + 1, scope) {
                return Some(stop);
            }
        }
        None
    }
}

fn child(parent: &ScanNodePath, name: &OsStr) -> Option<ScanNodePath> {
    let mut components = Path::new(name).components();
    match (components.next(), components.next()) {
        (Some(Component::Normal(component)), None) if component == name => {}
        _ => return None,
    }
    let text = name.to_str()?; // Non-Unicode names are not lossily converted into IO paths.
    let relative = if parent.relative.as_str().is_empty() {
        text.to_owned()
    } else {
        format!("{}/{text}", parent.relative.as_str())
    };
    let relative = RelativePath::new(relative).ok()?;
    let run_relative =
        RelativePath::new(format!("{}/{text}", parent.run_relative.as_str())).ok()?;
    Some(ScanNodePath {
        absolute: parent.absolute.join(name),
        scope_id: parent.scope_id.clone(),
        relative,
        run_relative,
        guards: Arc::clone(&parent.guards),
    })
}
