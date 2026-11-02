#!/usr/bin/env bash
# Tree A, part by part (one at a time): D, process, rules, scan, then UI. Service runs later on its own.
R=/f/new/smaltalk/water/.local/w9-integ6/run.sh
$R d lock check test
$R process lock check test real:final
$R rules lock check test real:final
$R scan lock check test real:final
$R ui check test browser
echo seq-a done
