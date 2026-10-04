"""Estimate the visible face geometry; unseen skull is completed in the viewer."""
import json
import sys
import os
import argparse
from pathlib import Path
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, os.environ.get('FAJIAN_RUNTIME', str(ROOT / '.runtime')))
import cv2
import numpy as np
import mediapipe as mp

parser = argparse.ArgumentParser(description='Estimate a face mesh from an explicitly supplied test portrait')
parser.add_argument('--source', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--provenance', required=True)
args = parser.parse_args()
source = args.source.resolve()
rgb = cv2.cvtColor(cv2.imdecode(np.fromfile(str(source), dtype=np.uint8), cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB)
with mp.solutions.face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.5) as detector:
    result = detector.process(rgb)
if not result.multi_face_landmarks:
    raise RuntimeError('No face detected; no mesh exported')
landmarks = result.multi_face_landmarks[0].landmark[:468]
h,w = rgb.shape[:2]
cx = (landmarks[234].x + landmarks[454].x) / 2
cy = (landmarks[10].y + landmarks[152].y) / 2
scale = 1.48 / ((landmarks[454].x - landmarks[234].x) * w)
z0 = (landmarks[234].z + landmarks[454].z) / 2
positions = [[(p.x-cx)*w*scale, (cy-p.y)*h*scale, (z0-p.z)*w*scale] for p in landmarks]
uv = [[p.x, 1-p.y] for p in landmarks]
indices=[]
for line in (ROOT/'docs/assets/canonical-face.obj').read_text().splitlines():
    if line.startswith('f '):
        tri=[int(v.split('/')[0])-1 for v in line.split()[1:]]
        for i in range(1,len(tri)-1): indices.extend([tri[0],tri[i],tri[i+1]])
oval=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109]
# Close eye and inner-lip openings with textured geometry, keeping reference appearance.
for loop in [[33,160,159,158,133,153,145,144],[362,385,386,387,263,373,374,380],[78,191,80,81,82,13,312,311,310,415,308,324,318,402,317,14,87,178,88,95]]:
    center=len(positions)
    positions.append(np.mean([positions[i] for i in loop],axis=0).tolist())
    uv.append(np.mean([uv[i] for i in loop],axis=0).tolist())
    for j in range(len(loop)): indices.extend([center,loop[j],loop[(j+1)%len(loop)]])
data={'positions':positions,'uv':uv,'indices':indices,'oval':oval,'source':args.provenance,'method':'MediaPipe FaceMesh 0.10.11, inferred depth from a single photograph','limitations':'Only front face is estimated; skull, ears and hair are procedural approximations.'}
samples=[]
for index in [50,280]:
    point=landmarks[index]
    x,y=int(point.x*w),int(point.y*h)
    samples.extend(rgb[max(0,y-5):min(h,y+6),max(0,x-5):min(w,x+6)].reshape(-1,3).tolist())
color=np.median(samples,axis=0).astype(int)
data['skinColor']='#'+''.join('{:02x}'.format(int(c)) for c in color)
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(data),encoding='utf-8')
print('Exported',len(positions),'vertices,',len(indices)//3,'triangles')
print('Bounds:',np.min(positions,axis=0),np.max(positions,axis=0))
