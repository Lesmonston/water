//! Windows junk rule registry: validation and scan-plan resolution.
#![forbid(unsafe_code)]

mod error;
mod folders;
mod plan;
mod rules;
mod types;

pub use error::RulesError;
pub use folders::KnownFolders;
pub use plan::{CustomRoot, ScanPlan, Target, plan_to_json, resolve_plan};
pub use rules::{Rule, RuleSet, RuleText, Source};
pub use types::{
    Category, Condition, Growth, InUse, InUseMode, ItemType, KnownFolder, Level, Locator, Marker,
    MatchSpec, SourceKind,
};
