import json
S='/tmp/claude-0/-home-claude/01d13f32-4712-5ae2-857d-66f6462d3c59/scratchpad/mlots/'
A=json.load(open(S+'all.json'))
K={'%d|%s'%(l['page'],l['ids']):l for b,L in A.items() for l in L}
def n(k): return K[k]['lot']
def lv(k): l=K[k]; return '<b>%s</b> = %.2f Ha · %d'%(l['lot'],l['ha'],l['palms'])
br=lambda b: ', '.join('%s (&asymp;%s)'%(l['lot'],l.get('est')) for l in A[b] if not l['ha'] and l['rings'])
one=lambda b,f: [l for l in A[b] if f(l)][0]
blue='pokok di situ dilukis biru muda di peta dron (di luar garis blok); bila dikira, bilangan sepadan dengan label'
l135=one('01',lambda l:l['ha']==1.35)
notes={
'MELU_Blok_01':'<b>Dipadankan, sahkan di ladang:</b> %s (dua bahagian yang dipisahkan oleh tulisan labelnya sendiri, dicantum); %s; %s; %s; %s; %s (dua bahagian); %s (dilukis %.2f Ha, sempadan bawah kurang pasti). <b>Semak:</b> %s dilukis %.2f Ha (label 1.35). Separuh %s, %s dan %s di luar garis blok. Petak coklat (tiada label, Ha diukur, pokok &asymp; dikira): %s.'%(
  lv('1|[40]'),lv('1|[59]'),lv('1|[9003]'),lv('1|[110]'),lv('1|[9001]'),lv('1|[111, 125]'),lv('1|[9002]'),K['1|[9002]']['traced'],
  l135['lot'],l135['traced'],n('1|[9003]'),one('01',lambda l:not l['ha'] and l['traced']==1.51)['lot'],one('01',lambda l:l['ha']==0.23)['lot'],br('01')),
'MELU_Blok_02':'<b>%s</b>: hampir semua di luar garis blok, &asymp;132 pokok (biru muda di peta dron) — semak sama ada ia petak Meliau. Separuh %s di luar garis blok: %s. Petak coklat: %s.'%(
  one('02',lambda l:not l['ha'] and l['traced']==0.85)['lot'],one('02',lambda l:l['ha']==1.31)['lot'],blue,br('02')),
'MELU_Blok_03':'Petak coklat: %s — tiada label, hampir tiada pokok.'%br('03'),
'MELU_Blok_04':'Separuh %s di luar garis blok: %s. Petak coklat: %s — tiada label, hampir tiada pokok.'%(one('04',lambda l:l['ha']==2.06)['lot'],blue,br('04')),
'MELU_Blok_05':'Baru dilukis: %s dan %s, jalur nipis di tepi blok (titik pemisah dianggar). Separuh %s di luar garis blok: %s.'%(lv('5|[9101]'),lv('5|[9102]'),one('05',lambda l:l['ha']==1.99)['lot'],blue),
'MELU_Blok_06':'Baru dilukis: %s (jalur nipis tepi timur) dan %s (baji di simpang jalan; garis label menunjuk ke sini). <b>Semak:</b> label %s terletak di atas petak ini tetapi dilukis %.2f Ha — mungkin ada petak kecil kedua di dalamnya. Petak coklat: %s.'%(lv('5|[9103]'),lv('1|[9201]'),lv('1|[148]'),K['1|[148]']['traced'],br('06')),
'MELU_Semua_Blok':'Semua 120 label di peta Christy sudah ada petak. Coklat = tiada label (Ha diukur, pokok dikira dari peta dron). Kedudukan diselaraskan dengan jalan di peta keseluruhan Meliau. 19.11.2026, malam.'}
for k,t in notes.items():
    p=S+'a3/%s.html'%k; h=open(p).read()
    h=h.replace('<div class="foot">','<p style="font-size:3mm;color:#a0522d;margin:2mm 0 0">%s</p><div class="foot">'%t,1); open(p,'w').write(h)
