// Synthetic orphan for the 10-29 replay: a hidden node child whose command line carries the default
// pattern "--headless"; this parent exits at once, so the child's parent is gone. The child ends itself
// after 90 s. Prints the child pid.
const { spawn } = require('child_process');
const child = spawn(process.execPath, ['-e', 'setTimeout(()=>{},90000)', '--', '--headless'], { detached: true, stdio: 'ignore', windowsHide: true });
console.log(child.pid);
child.unref();
