
var fs = require('fs');
var _ = require('lodash');

var translateColor = (color) => ({ r: 'Red', g: 'Green'}[color]);
var translateText  = (color) => ({ r: 'v', g: '^' }[color]);

var COLORS = {
  r: '#ff0000',
  g: '#00aa00',
  b: '#0000aa'
};

var BASE_NANDECK = `
PAGE=21.6, 29.7, "PORTRAIT", HV
DPI=300
CARDSIZE=9.6, 9.6
MARGINS=0.45, 0.45, 0.45, 0.45
GAP=0, 0
BORDER=MARK

[Color]=#000000
[Thickness]=0.2

[Red]   = Arial, 10,, ${COLORS.r}
[Green] = Arial, 10,, ${COLORS.g}
[Blue]  = Arial, 10,, ${COLORS.b}

[Min]=0
[First]=1.6
[Second]=8
[Max]=9.6
`;

var COUNTS = {
  deadEnd:  { tile: 4,  distributions: { r: 4, b: 0, g: 0 } },
  hallway:  { tile: 10, distributions: { r: 4, b: 3, g: 3 } },
  elbow:    { tile: 14, distributions: { r: 6, b: 3, g: 5 } },
  threeWay: { tile: 14, distributions: { r: 7, b: 4, g: 3 } },
  fourWay:  { tile: 14, distributions: { r: 6, b: 4, g: 4 } }
};

var addColor = (index, color) => {
  if(color === 'b') return;
  var TEXT_HEIGHT = 0.3;

  return _.map(color.split(''), (color, offset) => {
    return `
font=[${translateColor(color)}]
text=${index}, "${translateText(color)}", 8.2, ${(offset+1) * TEXT_HEIGHT}, 1.6, ${TEXT_HEIGHT}
    `;
  }).join('\n');
};

var PATTERNS = {
  deadEnd: (index) => {
    return `
line=${index}, [First],  [Min],    [First],  [Second], [Color], [Thickness]
line=${index}, [First],  [Second], [Second], [Second], [Color], [Thickness]
line=${index}, [Second], [Min],    [Second], [Second], [Color], [Thickness]
    `;
  },
  hallway: (index) => {
    return `
line=${index}, [First],  [Min],    [First],  [Max], [Color], [Thickness]
line=${index}, [Second], [Min],    [Second], [Max], [Color], [Thickness]
    `;
  },
  elbow: (index) => {
    return `
line=${index}, [First],  [Min],    [First],  [Second], [Color], [Thickness]
line=${index}, [First],  [Second], [Max],    [Second], [Color], [Thickness]
line=${index}, [Second], [Min],    [Second], [First],  [Color], [Thickness]
line=${index}, [Second], [First],  [Max],    [First],  [Color], [Thickness]
    `;
  },
  threeWay: (index) => {
   return `
line=${index}, [First],  [Min],    [First],  [Max],    [Color], [Thickness]
line=${index}, [Second], [Min],    [Second], [First],  [Color], [Thickness]
line=${index}, [Second], [First],  [Max],    [First],  [Color], [Thickness]
line=${index}, [Second], [Second], [Max],    [Second], [Color], [Thickness]
line=${index}, [Second], [Second], [Second], [Max],    [Color], [Thickness]
   `;
  },
  fourWay: (index) => {
   return `
line=${index}, [Min],    [First],  [First],  [First],  [Color], [Thickness]
line=${index}, [First],  [Min],    [First],  [First],  [Color], [Thickness]
line=${index}, [Min],    [Second], [First],  [Second], [Color], [Thickness]
line=${index}, [First],  [Second], [First],  [Max],    [Color], [Thickness]
line=${index}, [Second], [Min],    [Second], [First],  [Color], [Thickness]
line=${index}, [Second], [First],  [Max],    [First],  [Color], [Thickness]
line=${index}, [Second], [Second], [Max],    [Second], [Color], [Thickness]
line=${index}, [Second], [Second], [Second], [Max],    [Color], [Thickness]
   `;
  }
};

var curTile = 1;
_.each(['deadEnd', 'hallway', 'elbow', 'threeWay', 'fourWay'], type => {
  _.each(['r', 'g', 'b'], colors => {
    for(var i = 0; i < COUNTS[type].distributions[colors]; i++) {
      var base = PATTERNS[type](curTile);
      base += addColor(curTile, colors);

      BASE_NANDECK += base;
      curTile++;
    }
  });
});

fs.writeFileSync('cc-tiles.txt', BASE_NANDECK);
