window.TUNE = {
  "global": {
    "ease": {
      "go": {
        "out": 0.8,
        "in": 0.8
      },
      "cam": {
        "peak": 0.5,
        "sharp": 16
      },
      "soft": {
        "peak": 0.4348,
        "sharp": 4.6
      },
      "pull": {
        "power": 5.63
      },
      "slam": {
        "back": 1.25,
        "power": 4
      },
      "brake": {
        "power": 4
      }
    },
    "lag": 0.07,
    "rotate": {
      "max": 28,
      "v0": 8,
      "dead": 4,
      "hz": 2.4,
      "zeta": 0.8,
      "zetaBack": 0.25,
      "send": 2.2
    },
    "handTilt": {
      "gain": 0.5,
      "max": 18,
      "hz": 2.4,
      "zeta": 0.75,
      "zetaBack": 0.25
    },
    "breath": {
      "amp": 0,
      "zoom": 0,
      "period": 5
    },
    "thud": {
      "hz": 4.4,
      "zeta": 0.6,
      "keep": 0.3
    },
    "enter": {
      "blur": 0.2,
      "dy": 0.45,
      "s0": 0.55,
      "hz": 3.2,
      "zeta": 0.45
    },
    "press": {
      "depth": 0.82,
      "hz": 3.6,
      "zeta": 0.5
    },
    "shutter": 0.5,
    "carry": {
      "max": 18,
      "v0": 30,
      "hz": 2.2,
      "zeta": 0.75,
      "zetaBack": 0.28
    },
    "win": {
      "pop": 0.45,
      "hz": 3.2,
      "zeta": 0.5,
      "tiltMax": 5,
      "v0": 120
    },
    "hold": {
      "max": 12,
      "v0": 10,
      "hz": 2.2,
      "zeta": 0.7,
      "zetaBack": 0.3
    },
    "grab": {
      "hz": 4.6,
      "zeta": 0.5
    },
    "comment": {
      "hz": 3.4,
      "zeta": 0.55
    },
    "clickSettle": 9,
    "canvasCursor": 30,
    "shrink": {
      "hz": 3.6,
      "zeta": 0.42
    },
    "swap": {
      "out": 9,
      "hold": 2,
      "in": 11
    },
    "pop": {
      "hz": 2.6,
      "zeta": 0.62
    },
    "dim": {
      "alpha": 0.62
    },
    "burst": {
      "hz": 3.2,
      "zeta": 0.42
    }
  },
  "camera": {
    "top": {
      "cx": 572,
      "cy": -32,
      "w": 357
    },
    "close": {
      "w": 337
    },
    "video": {
      "w": 615
    },
    "s2": {
      "cx": 585,
      "cy": 494,
      "w0": 340,
      "w1": 330
    },
    "send": {
      "w0": 190,
      "w1": 176
    },
    "panSpeed": 44,
    "match": 0.8,
    "med": {
      "cx": 670,
      "cy": 600,
      "w": 1350,
      "w1": 1290
    },
    "macroMatch": 0.75,
    "m1": {
      "w0": 300,
      "w1": 280,
      "rx": 12,
      "ry": -20,
      "rz": 5,
      "follow": 0.35
    },
    "m2": {
      "w0": 280,
      "w1": 262,
      "rx": 8,
      "ry": -24,
      "rz": -3,
      "follow": 0.35
    },
    "m3": {
      "w0": 300,
      "w1": 440,
      "rx": 14,
      "ry": -16,
      "rz": 4,
      "follow": 0.3
    },
    "wordSpeed": 70,
    "wordMatch": 0.8,
    "words": [
      {
        "w": 420,
        "rx": 0,
        "ry": 0,
        "rz": 0
      },
      {
        "w": 400,
        "rx": 0,
        "ry": 0,
        "rz": 0
      },
      {
        "w": 420,
        "rx": 0,
        "ry": 0,
        "rz": 0
      }
    ],
    "app": {
      "cx": 620,
      "cy": 470,
      "w": 560,
      "rx": 0,
      "ry": 0,
      "rz": 0
    },
    "sendMatch": 0.7
  },
  "timeline": [
    {"id":"tilt","ref":null,"offset":0,"dur":50,"curve":"cam"},
    {"id":"tweetIn","kind":"group","ref":"tilt","at":"start","offset":0,"dur":44,"stagger":1},
    {"id":"cursorIn","ref":"tilt","at":"start","offset":16,"dur":43,"curve":"go","ease":{"peak":0.31,"sharp":16}},
    {"id":"swipe","ref":"cursorIn","at":"end","offset":-8,"dur":36,"curve":"go"},
    {"id":"pull","ref":"swipe","at":"end","offset":-2,"dur":50,"curve":"cam"},
    {"id":"toPlay","ref":"pull","at":"start","offset":2,"dur":59,"curve":"go"},
    {"id":"click","kind":"event","ref":"toPlay","at":"arrive","offset":0},
    {"id":"play","ref":"click","at":"start","offset":2,"dur":306},
    {"id":"dimIn","ref":"play","at":"start","offset":0,"dur":16,"curve":"go"},
    {"id":"away","ref":"click","at":"start","offset":6,"dur":77,"curve":"go"},
    {"id":"ret","ref":"play","at":"end","offset":-30,"dur":50,"curve":"go","ease":{"out":0.35,"in":0.95}},
    {"id":"dimOut","ref":"ret","at":"start","offset":-8,"dur":20,"curve":"go"},
    {"id":"grab","kind":"event","ref":"ret","at":"arrive","offset":0},
    {"id":"lift","ref":"grab","at":"start","offset":1,"dur":34,"curve":"go","ease":{"out":0.06,"in":0.85}},
    {"id":"h2in","ref":"grab","at":"start","offset":8,"dur":34,"curve":"go"},
    {"id":"tab","kind":"event","ref":"h2in","at":"start","offset":12},
    {"id":"grip","kind":"event","ref":"h2in","at":"arrive","offset":0},
    {"id":"drag","ref":"grip","at":"start","offset":3,"dur":20,"curve":"pull"},
    {"id":"aiIn","kind":"event","ref":"drag","at":"start","offset":11},
    {"id":"pan","kind":"spike","ref":"drag","at":"end","offset":1,"dur":15},
    {"id":"arrowIn","ref":"pan","at":"end","offset":1,"dur":36,"curve":"go"},
    {"id":"click2","kind":"event","ref":"arrowIn","at":"arrive","offset":0},
    {"id":"drift","ref":"click2","at":"start","offset":3,"dur":38,"curve":"go"},
    {"id":"type","kind":"type","ref":"click2","at":"start","offset":6,"gaps":[2,2,5,2,3,2,3,5,2,3,2],"scale":1.258},
    {"id":"slam","ref":"type","at":"end","offset":-20,"dur":24,"curve":"slam"},
    {"id":"out","ref":"slam","at":"end","offset":3,"dur":26,"curve":"pull"},
    {"id":"send","ref":"type","at":"end","offset":-4,"dur":68,"curve":"go"},
    {"id":"sendIn","ref":"send","at":"peak","offset":0,"dur":22,"curve":"brake","ease":{"power":3}},
    {"id":"click3","kind":"event","ref":"sendIn","at":"arrive","offset":0},
    {"id":"hover","kind":"event","ref":"click3","at":"start","offset":-16},
    {"id":"fly","ref":"click3","at":"start","offset":2,"dur":36,"curve":"go"},
    {"id":"rest","ref":"click3","at":"start","offset":6,"dur":44,"curve":"go"},
    {"id":"c1","ref":"click3","at":"start","offset":5,"dur":40,"curve":"go"},
    {"id":"c2","ref":"click3","at":"start","offset":13,"dur":42,"curve":"go"},
    {"id":"pullOut","ref":"c1","at":"end","offset":-4,"dur":60,"curve":"cam"},
    {"id":"c3","ref":"pullOut","at":"start","offset":2,"dur":44,"curve":"go"},
    {"id":"c4","ref":"pullOut","at":"start","offset":10,"dur":44,"curve":"go"},
    {"id":"c5","ref":"pullOut","at":"start","offset":16,"dur":46,"curve":"go"},
    {"id":"c6","ref":"pullOut","at":"start","offset":24,"dur":44,"curve":"go"},
    {"id":"c7","ref":"pullOut","at":"start","offset":40,"dur":46,"curve":"go"},
    {"id":"c8","ref":"pullOut","at":"start","offset":58,"dur":46,"curve":"go"},
    {"id":"c9","ref":"pullOut","at":"start","offset":76,"dur":46,"curve":"go"},
    {"id":"grabIn","ref":"pullOut","at":"end","offset":-14,"dur":40,"curve":"go","ease":{"out":0.35,"in":0.95}},
    {"id":"grabWin","kind":"event","ref":"grabIn","at":"arrive","offset":0},
    {"id":"winOut","ref":"grabWin","at":"start","offset":6,"dur":26,"curve":"pull"},
    {"id":"m1","ref":"winOut","at":"end","offset":0,"dur":24,"curve":"brake"},
    {"id":"m1out","ref":"m1","at":"end","offset":6,"dur":18,"curve":"pull"},
    {"id":"m2","ref":"m1out","at":"end","offset":0,"dur":26,"curve":"brake"},
    {"id":"m2out","ref":"m2","at":"end","offset":8,"dur":18,"curve":"pull"},
    {"id":"m3","ref":"m2out","at":"end","offset":0,"dur":26,"curve":"brake"},
    {"id":"m3away","ref":"m3","at":"end","offset":4,"dur":30,"curve":"go"},
    {"id":"uIn","ref":"m3","at":"end","offset":2,"dur":34,"curve":"go","ease":{"out":0.35,"in":0.95}},
    {"id":"uClick","kind":"event","ref":"uIn","at":"arrive","offset":0},
    {"id":"cmtCam","ref":"uClick","at":"start","offset":0,"dur":30,"curve":"cam"},
    {"id":"type3","kind":"type","text":"comment.first","ref":"uClick","at":"start","offset":18,"gaps":[4,3,4],"scale":1},
    {"id":"cmtSend","ref":"type3","at":"end","offset":6,"dur":18,"curve":"go"},
    {"id":"cmtClick","kind":"event","ref":"cmtSend","at":"arrive","offset":0},
    {"id":"level","ref":"cmtClick","at":"start","offset":-1,"dur":50,"curve":"cam","ease":{"peak":0.5,"sharp":5}},
    {"id":"cmtGone","ref":"cmtClick","at":"start","offset":3,"dur":16,"curve":"go"},
    {"id":"backCam","ref":"cmtClick","at":"start","offset":2,"dur":26,"curve":"cam"},
    {"id":"uAway","ref":"cmtClick","at":"start","offset":6,"dur":40,"curve":"go"},
    {"id":"swap0","kind":"event","ref":"cmtClick","at":"start","offset":4},
    {"id":"whip0","kind":"spike","ref":"swap0","at":"start","offset":34,"dur":12},
    {"id":"w1","kind":"event","ref":"whip0","at":"end","offset":4},
    {"id":"whip1","kind":"spike","ref":"w1","at":"start","offset":32,"dur":10},
    {"id":"w2","kind":"event","ref":"whip1","at":"end","offset":4},
    {"id":"whip2","kind":"spike","ref":"w2","at":"start","offset":32,"dur":10},
    {"id":"w3","kind":"event","ref":"whip2","at":"end","offset":4},
    {"id":"whip3","kind":"spike","ref":"w3","at":"start","offset":34,"dur":12},
    {"id":"appUp","kind":"event","ref":"whip3","at":"end","offset":-3},
    {"id":"reply3","kind":"stream","text":"final.reply","every":2,"ref":"appUp","at":"start","offset":10},
    {"id":"vcard","kind":"event","ref":"reply3","at":"end","offset":2},
    {"id":"toVideo","ref":"vcard","at":"start","offset":16,"dur":50,"curve":"brake","ease":{"power":2.6}},
    {"id":"openV","kind":"event","ref":"toVideo","at":"arrive","offset":0},
    {"id":"expand","ref":"openV","at":"start","offset":1,"dur":14,"curve":"cam"},
    {"id":"playV","ref":"expand","at":"start","offset":8,"dur":612},
    {"id":"burst","ref":"playV","at":"end","offset":0,"dur":18},
    {"id":"tab2","kind":"event","ref":"burst","at":"start","offset":12},
    {"id":"h3in","ref":"tab2","at":"start","offset":-8,"dur":28,"curve":"go"},
    {"id":"grip2","kind":"event","ref":"h3in","at":"arrive","offset":0},
    {"id":"drag2","ref":"grip2","at":"start","offset":3,"dur":22,"curve":"pull"},
    {"id":"credIn","kind":"event","ref":"drag2","at":"end","offset":0},
    {"id":"end","kind":"event","ref":"drag2","at":"end","offset":110}
  ]
};
