# Rebuild each ticket negative control from the worker's red-ncN receipt snapshots.
# For every passed red-ncN receipt (latest per label), compare each snapshotted production file with the
# worker tree's clean bytes and emit the minimal unique hunk as a controls.mjs mutation.
# Usage: python nc-replay.py n4 n6 ...   -> merges into .local/w14-accept/mutations.json (keeps c* entries)
import json,sys,os,glob
root='F:/new/smaltalk/water'
mp=root+'/.local/w14-accept/mutations.json'
muts=json.load(open(mp,encoding='utf-8')) if os.path.exists(mp) else {}
man=json.load(open(root+'/docs/dispatch/wave14/manifest.json',encoding='utf-8'))
def hunk(clean,mut):
    p=0
    while p<min(len(clean),len(mut)) and clean[p]==mut[p]: p+=1
    s=0
    while s<min(len(clean),len(mut))-p and clean[-1-s]==mut[-1-s]: s+=1
    a,b=p,len(clean)-s; c,d=p,len(mut)-s
    # widen to whole lines, then by lines until the old text is unique and non-empty
    while True:
        a2=clean.rfind('\n',0,a)+1; b2=clean.find('\n',b); b2=len(clean) if b2<0 else b2
        old=clean[a2:b2]; new=mut[a2:len(mut)-(len(clean)-b2)]
        if old and clean.count(old)==1: return old,new
        a=max(a2-1,0); b=min(b2+1,len(clean))
for slot in sys.argv[1:]:
    t=next(t for t in man['tasks'] if t['slot']=='w14-'+slot)
    rdir=f"{root}/.worktrees/w14-{slot}/{t['evidenceDir']}receipts"
    out=[m for m in muts.get(slot,[]) if not m['label'].startswith('nc')]
    ncs=[]
    for label,token in t['proofTargets'].items():
        recs=sorted(glob.glob(f'{rdir}/*-red-{label}-result.json'))
        recs=[r for r in recs if (lambda j:j['status']=='passed' and j['observedExpectedFailure'])(json.load(open(r,encoding='utf-8')))]
        r=json.load(open(recs[-1],encoding='utf-8'))
        changed=[]
        for f in r['sourceState']['files']:
            if f['test']: continue
            snap=open(f"{rdir}/{f['snapshot']}",'rb').read(); cur=open(f"{root}/.worktrees/w14-{slot}/{f['path']}",'rb').read()
            if snap!=cur: changed.append((f['path'],cur.decode('utf-8'),snap.decode('utf-8')))
        assert len(changed)==1,(slot,label,[c[0] for c in changed])
        path,clean,mut=changed[0]; old,new=hunk(clean,mut)
        ncs.append({'label':label,'mode':'red-'+label,'token':token,'file':path,'old':old,'new':new,'why':'ticket control replayed from worker receipt '+os.path.basename(recs[-1])})
        print(slot,label,path,repr(old[:160]),'=>',repr(new[:160]))
    muts[slot]=ncs+out
json.dump(muts,open(mp,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
