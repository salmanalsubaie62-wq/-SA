#!/bin/bash
# يجمع فريمات Blender (كل فريم ثاني من 24fps = 12fps) ويرفعها لـ 1080x1920 و30fps ويضيف العنوان والصوت
set -e
FR=${1:-/tmp/claude-0/-home-user--SA/b48c2f9c-44a1-5145-8c89-4f6000d2188d/scratchpad/bl}
OUT=${2:-../NOIR_EMERALD_BLENDER_AD.mp4}
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf
ffmpeg -y -loglevel error -framerate 12 -pattern_type glob -i "$FR/f_*.png" -i audio12.wav \
 -vf "scale=1080:1920:flags=lanczos,minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1,\
drawtext=fontfile=$FONT:text='N O I R   E M E R A L D':fontcolor=0xF3E3B4:fontsize=64:x=(w-text_w)/2:y=h*0.86:alpha='if(lt(t,10),0,min(1,(t-10)/0.8))',\
drawtext=fontfile=$FONT:text='THE ART OF PRESENCE':fontcolor=0xE0C88A:fontsize=30:x=(w-text_w)/2:y=h*0.905:alpha='if(lt(t,10.6),0,min(1,(t-10.6)/0.8))',\
fade=t=in:st=0:d=0.5,fade=t=out:st=11.4:d=0.6,format=yuv420p" \
 -c:v libx264 -preset slow -crf 17 -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
