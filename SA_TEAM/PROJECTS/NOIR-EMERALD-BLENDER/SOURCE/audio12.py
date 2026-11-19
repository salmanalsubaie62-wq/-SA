import numpy as np, wave
sr=44100; D=12.0; n=int(sr*D); t=np.arange(n)/sr
rng=np.random.default_rng(9)
def lp(x,a):
    y=np.zeros_like(x)
    for i in range(1,len(x)): y[i]=y[i-1]+a*(x[i]-y[i-1])
    return y
def at(t0,x):
    m=np.zeros(n);i0=int(t0*sr);seg=x[:max(0,min(len(x),n-i0))];m[i0:i0+len(seg)]=seg;return m
pad=np.zeros(n)
for f,g in [(73.4,1),(110,.8),(146.8,.6),(220,.5),(293.7,.35)]:
    for d in (-.4,.4): pad+=g*np.sin(2*np.pi*(f+d)*t+0.5*np.sin(2*np.pi*.15*t))
pad*=np.clip(.06+t/12*.16,0,1)*np.clip(1-(t-10.5)/1.5,0,1)*0.09
wind=lp(rng.standard_normal(n),0.02)*6*(0.05+0.03*np.sin(2*np.pi*.1*t))*np.clip(1-t/8,0.2,1)
tt=np.arange(int(sr*2.5))/sr
boom=np.sin(2*np.pi*(52-8*tt)*tt)*np.exp(-tt*1.8)*0.5
tr=np.arange(int(sr*2.0))/sr
riser=lp(rng.standard_normal(len(tr)),0.15)*np.linspace(0,1,len(tr))**2*0.45
tr2=np.arange(int(sr*3))/sr
hit=(np.sin(2*np.pi*58*tr2)*np.exp(-tr2*1.8)*0.55+(np.sin(2*np.pi*880*tr2)+np.sin(2*np.pi*1318.5*tr2)*.7)*np.exp(-tr2*1.1)*0.12)
ch=np.zeros(n)
for t0,f in [(3.3,1568),(4.1,2093),(4.9,1760),(5.8,2349),(6.5,2637),(8.2,3136),(9.9,1568)]:
    tc=np.arange(int(sr*2.2))/sr
    ch+=at(t0,np.sin(2*np.pi*f*tc)*np.exp(-tc*2.2)*0.13+np.sin(2*np.pi*f*2.76*tc)*np.exp(-tc*5)*0.04)
tw=np.arange(int(sr*1.4))/sr
who=lp(rng.standard_normal(len(tw)),0.08)*np.sin(np.pi*tw/1.4)**2*0.32
tm=np.arange(int(sr*1.2))/sr
sw2=lp(rng.standard_normal(len(tm)),0.2)*np.sin(np.pi*tm/1.2)**2*0.16
tf=np.arange(int(sr*3.5))/sr
fin=np.sin(2*np.pi*49*tf)*np.exp(-tf*.9)*0.4
sw=np.zeros(n)
for f in (293.7,440,587.3,880): sw+=np.sin(2*np.pi*f*t)*(0.5+0.1*np.sin(2*np.pi*5*t))
sw*=np.clip((t-6)/4,0,1)*np.clip(1-(t-10.8)/1.2,0,1)*0.05
mix=pad+wind+sw+at(0.2,boom)+at(1.0,riser)+at(2.9,hit)+ch+at(3.6,who)+at(7.4,sw2)+at(9.9,fin)
d=int(sr*0.012);L=mix;R=np.concatenate([np.zeros(d),mix[:-d]])*0.97
st=np.stack([L,R],1)*np.clip(t/0.6,0,1)[:,None]*np.clip((D-t)/1.2,0,1)[:,None]
st/=np.abs(st).max()/0.85
w=wave.open('audio12.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((st*32767).astype(np.int16).tobytes());w.close()
