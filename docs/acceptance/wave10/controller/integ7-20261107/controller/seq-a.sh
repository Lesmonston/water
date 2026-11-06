#!/usr/bin/env bash
# Tree A, part by part (one cargo at a time): executor, process, rules, scan, declarations, duplicates, installed apps, then UI.
# The service runs later on its own (it has timing limits); the host runs in tree B after tree A stops.
R=/f/new/smaltalk/water/.local/w10-integ7/run.sh
$R exec lock check test real:final
$R process lock check test real:final
$R rules lock check test real:final
$R scan lock check test real:final
$R decl lock check test real:final
$R dup lock check test real:final
$R apps lock check test real:final
$R ui check test browser
echo seq-a done
