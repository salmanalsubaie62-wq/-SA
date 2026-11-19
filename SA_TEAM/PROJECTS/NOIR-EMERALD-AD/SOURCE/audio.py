import numpy as np, wave
sr=44100; D=24.0; n=int(sr*D); t=np.arange(n)/sr
rng=np.random.default_rng(5)
def env(a,b,x0,x1):  # linear ramp between times, clamped
    return np.clip((t-x0)/(x1-x0),0,1)*(b-a)+a
def lp(x,k):  # one-pole lowpass
    y=np.zeros_like(x);a=k
    for i in range(1,len(x)): y[i]=y[i-1]+a*(x[i]-y[i-1])
    return y
L=np.zeros(n);R=np.zeros(n)
# pad: dark chord, slow swell
pad=np.zeros(n)
for f,g in [(73.4,1),(110,.8),(146.8,.6),(220,.5),(293.7,.35)]:
    for d in (-.4,.4):
        pad+=g*np.sin(2*np.pi*(f+d)*t+0.5*np.sin(2*np.pi*.15*t))
pad*=env(.05,.22,0,20)*np.clip(1-(t-22)/2,0,1)*0.09
# string-like upper swell 16-23
sw=np.zeros(n)
for f in (293.7,440,587.3,880):
    sw+=np.sin(2*np.pi*f*t)*np.sin(2*np.pi*5*t)*0.1+np.sin(2*np.pi*f*1.003*t)*0.5
sw*=np.clip((t-15)/5,0,1)*np.clip(1-(t-22.5)/1.5,0,1)*0.05
# ambient wind
noise=rng.standard_normal(n); wind=lp(noise,0.02)*6
wind*=(0.05+0.03*np.sin(2*np.pi*.1*t))*np.clip(1-t/14,0.15,1)
# boom at 3.0
def at(t0,x,dur): 
    m=np.zeros(n);i0=int(t0*sr);seg=x[:min(len(x),n-i0)];m[i0:i0+len(seg)]=seg;return m
tt=np.arange(int(sr*3))/sr
boom=np.sin(2*np.pi*(52-8*tt)*tt)*np.exp(-tt*1.6)*0.55
# reveal at 9.0: riser + hit + shimmer
tr=np.arange(int(sr*2.2))/sr
riser=lp(rng.standard_normal(len(tr)),0.15)*np.linspace(0,1,len(tr))**2*0.5
tr2=np.arange(int(sr*3.5))/sr
hit=(np.sin(2*np.pi*58*tr2)*np.exp(-tr2*1.8)*0.6+(np.sin(2*np.pi*880*tr2)+np.sin(2*np.pi*1318.5*tr2)*.7)*np.exp(-tr2*1.1)*0.12)
# chimes
chime=np.zeros(n)
for t0,f in [(12.3,1568),(13.1,2093),(13.8,1760),(14.6,2349),(15.3,2637),(17.2,3136),(20.6,1568)]:
    tc=np.arange(int(sr*2.2))/sr
    chime+=at(t0,np.sin(2*np.pi*f*tc)*np.exp(-tc*2.2)*0.13+np.sin(2*np.pi*f*2.76*tc)*np.exp(-tc*5)*0.04,2.2)
# whoosh ~13.0-14.2
tw=np.arange(int(sr*1.4))/sr
who=lp(rng.standard_normal(len(tw)),0.08)*np.sin(np.pi*tw/1.4)**2*0.35
# macro swish 16.2
tm=np.arange(int(sr*1.2))/sr
sw2=lp(rng.standard_normal(len(tm)),0.2)*np.sin(np.pi*tm/1.2)**2*0.18
# final peak 19-21 then calm: low pulse
tf=np.arange(int(sr*4))/sr
fin=np.sin(2*np.pi*49*tf)*np.exp(-tf*.9)*0.45
mix=pad+sw+wind+at(3.0,boom,3)+at(7.2,riser,2.2)+at(9.0,hit,3.5)+chime+at(13.0,who,1.4)+at(16.2,sw2,1.2)+at(19.0,fin,4)
# stereo: slight decorrelation
d=int(sr*0.012)
L=mix;R=np.concatenate([np.zeros(d),mix[:-d]])*0.97
st=np.stack([L,R],1)
st*=np.clip(t/0.8,0,1)[:,None]*np.clip((D-t)/1.5,0,1)[:,None]
st/=np.abs(st).max()/0.85
w=wave.open('audio.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((st*32767).astype(np.int16).tobytes());w.close()
