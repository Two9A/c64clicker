define(function() {
    return {
        effects: {
            rasterbars: false,
            scrollshake: false
        },
        colorRam: null,
        curLineScr: null,
        curLineCol: null,
        curLineSpr: null,
        spriteRasters: [],
        rasterModes: [],
        rasterbarsValues: null,

        backCanvas: null,
        backContext: null,
        renderedFrames: {},

        SCREENPTR:  null,
        CHARPTR:    null,
        IRM:        null,
        RSEL:       null,
        CSEL:       null,
        DISPLAY:    null,
        HIRES:      null,
        EXTCOLOR :  null,
        MULTICOLOR: null,
        XSCROLL:    null,
        YSCROLL:    null,
        BORDER:     null,
        BG0:        null,
        BG1:        null,
        BG2:        null,
        BG3:        null,
        RASTERHIT:  null,

        SPR:        null,

        r: function(addr) {
            addr += (this.owner.MMU.vicBank * 16384);
            switch (addr & 0xF000) {
                case 0x1000:
                case 0x9000:
                    return this.owner.MMU.charRom[addr & 0x0FFF];
                default:
                    return this.owner.MMU.ram[addr];
            }
        },
        w: function(addr, val) {
            // The VIC doesn't write to memory!
        },
        io_r: function(addr) {
            addr &= 63;
            return (this.registers[addr] !== undefined) ? this.registers[addr] : 0;
        },
        io_w: function(addr, val) {
            var i, x;
            addr &= 63;
            switch (addr) {
                case 0: // SPRX0
                case 2: // SPRX1
                case 4: // SPRX2
                case 6: // SPRX3
                case 8: // SPRX4
                case 10: // SPRX5
                case 12: // SPRX6
                case 14: // SPRX7
                    // X-coords are "real", as opposed to the register mapped
                    // coordinate system, which is 68 pixels indented
                    x = this.SPR[addr >> 1].x - this.sizes.HBL - this.sizes.BORDER + 24;
                    x = (x & 256) + val;
                    this.SPR[addr >> 1].x = x + this.sizes.HBL + this.sizes.BORDER - 24;
                    break;
                case 1: // SPRY0
                case 3: // SPRY1
                case 5: // SPRY2
                case 7: // SPRY3
                case 9: // SPRY4
                case 11: // SPRY5
                case 13: // SPRY6
                case 15: // SPRY7
                    // Y-coords are "real", as opposed to the register mapped
                    // coordinate system, which is 29 rasters indented
                    this.SPR[addr >> 1].y = val + this.sizes.VBLT + 12;
                    this.fillSpriteRasters();
                    break;
                case 16: // SPRXHI
                    for (i = 0; i < 8; i++) {
                        x = this.SPR[i].x - this.sizes.HBL - this.sizes.BORDER + 24;
                        x = (x & 255) + ((val & (1 << i)) ? 256 : 0);
                        this.SPR[i].x = x + this.sizes.HBL + this.sizes.BORDER - 24;
                    }
                    break;
                case 17: // FLAGS1
                    this.YSCROLL = val & 7;
                    this.RSEL = !!(val & 8);
                    this.DISPLAY = !!(val & 16);
                    this.HIRES = !!(val & 32);
                    this.EXTCOLOR = !!(val & 64);
                    if (val & 128) {
                        this.RASTERHIT |= 256;
                    } else {
                        this.RASTERHIT &= 255;
                    }
                    if (this.RSEL) {
                        this.sizes.BORDERV = 42;
                        this.sizes.HEIGHT = 200;
                    } else {
                        this.sizes.BORDERV = 46;
                        this.sizes.HEIGHT = 192;
                    }
                    this.fillRasterModes();
                    break;
                case 18: // RASTER
                    this.RASTERHIT = (this.RASTERHIT & 256) | val;
                    break;
                case 19: // LPX and
                case 20: // LPY not supported
                    break;
                case 21: // SPREN
                    for (i = 0; i < 8; i++) {
                        this.SPR[i].on = !!(val & (1 << i));
                    }
                    this.fillSpriteRasters();
                    break;
                case 22: // FLAGS2
                    this.XSCROLL = val & 7;
                    this.CSEL = !!(val & 8);
                    this.MULTICOLOR = !!(val & 16);
                    if (this.CSEL) {
                        this.sizes.BORDERL = 42;
                        this.sizes.BORDERR = 42;
                        this.sizes.WIDTH = 320;
                    } else {
                        this.sizes.BORDERL = 49;
                        this.sizes.BORDERR = 51;
                        this.sizes.WIDTH = 304;
                    }
                    break;
                case 23: // SPRDBLY
                    for (i = 0; i < 8; i++) {
                        this.SPR[i].double_y = !!(val & (1 << i));
                    }
                    this.fillSpriteRasters();
                    break;
                case 24: // POINTERS
                    this.SCREENPTR = (val & 240) >> 4;
                    this.CHARPTR = (val & 14) >> 1;
                    break;
                case 25: // IRQ clears when written
                    this.registers[addr] = 0;
                    return;
                case 26: // IRM
                    this.IRM = val;
                    break;
                case 27: // SPROVER
                    for (i = 0; i < 8; i++) {
                        this.SPR[i].below_bg = !!(val & (1 << i));
                    }
                    break;
                case 28: // SPRMM
                    for (i = 0; i < 8; i++) {
                        this.SPR[i].multicolor = !!(val & (1 << i));
                    }
                    break;
                case 29: // SPRDBLX
                    for (i = 0; i < 8; i++) {
                        this.SPR[i].double_x = !!(val & (1 << i));
                    }
                    break;
                case 30: // SPRCOLL and
                case 31: // SPRBGCOLL are readonly
                    break;
                case 32: // BORDER
                    this.BORDER = val & 15;
                    break;
                case 33: // BG0
                    this.BG0 = val & 15;
                    break;
                case 34: // BG1
                    this.BG1 = val & 15;
                    break;
                case 35: // BG2
                    this.BG2 = val & 15;
                    break;
                case 36: // BG3
                    this.BG3 = val & 15;
                    break;
                case 37: // SPRMM0
                    this.SPRMM0 = val & 15;
                    break;
                case 38: // SPRMM1
                    this.SPRMM1 = val & 15;
                    break;
                case 39: // SPRC0
                case 40: // SPRC1
                case 41: // SPRC2
                case 42: // SPRC3
                case 43: // SPRC4
                case 44: // SPRC5
                case 45: // SPRC6
                case 46: // SPRC7
                    this.SPR[addr - 39].col = val & 15;
                    break;
            }

            if (this.registers[addr] !== undefined) {
                this.registers[addr] = val;
            }
        },
        renderFrame: function(pixels) {
            var i = 0, j, k, p;
            var x = 0, y = 0, step = 0, pos = 0, mode = 0, row = 0, loc = 0;
            var sx, cx, cy, px, py,
                left_border, right_border,
                left_hbl = this.sizes.HBL,
                right_hbl = this.sizes.RASTER_LENGTH - this.sizes.HBL,
                top_border = this.sizes.VBLT + this.sizes.BORDER,
                bottom_border = this.sizes.VBLT + this.sizes.BORDER + this.sizes.HEIGHT_ORIG,
                locBase = this.SCREENPTR * 1024,
                charBase = this.CHARPTR * 2048;

            var imageData = this.backContext.getImageData(0, 0, this.sizes.RASTER_LENGTH, this.sizes.RASTER_COUNT);

            // Bit of a hack...
            for (j = 0; j < 40; j++) {
                this.curLineScr[j] = 32;
            }

            do {
                if (x == 0 && this.effects.rasterbars) {
                    this.io_w(this.rg.BORDER, this.rasterbarsValues[y>>3]);
                }

                left_border = this.sizes.HBL + this.sizes.BORDERL;
                right_border = this.sizes.RASTER_LENGTH - this.sizes.BORDERR - this.sizes.HBL;

                // Character-mode badline, locks the bus for 40 phi-1 cycles
                if (y >= top_border && y < bottom_border) {
                    sx = x - this.sizes.HBL - this.sizes.BORDER - this.XSCROLL;
                    cx = sx & 7;
                    cy = (y - this.YSCROLL) & 7;

                    if (sx == 0 && cy == 0) {
                        if (row < 25) {
                            this.owner.MMU.busLock += 40;
                            for (j = 0; j < 40; j++) {
                                this.curLineScr[j] = this.r(locBase + loc);
                                this.curLineCol[j] = this.colorRam[loc];
                                loc++;
                            }
                            row++;
                        }
                    }
                }

                // Sprite data read, locks the bus for 2 phi-1's per sprite
                // Starts at HBL on the previous line
                if (y < 255) {
                    if (x > right_hbl) {
                        for (j in this.spriteRasters[y + 1]) {
                            this.owner.MMU.busLock += 2;
                            k = this.spriteRasters[y + 1][j];
                            p = this.r(locBase + 1016 + k);
                            py = y + 1 - this.SPR[k].y;
                            if (this.SPR[k].double_y) {
                                py >>= 1;
                            }
                            py = p * 64 + py * 3;

                            this.curLineSpr[k * 3 + 0] = this.r(py + 0);
                            this.curLineSpr[k * 3 + 1] = this.r(py + 1);
                            this.curLineSpr[k * 3 + 2] = this.r(py + 2);
                        }
                    }
                }

                // BUGBUG: This obviously doesn't allow for hyperscreen
                switch (this.rasterModes[y]) {
                    // VBlank
                    case 1:
                        mode = 1;
                        j = ((y&4) ^ (x&4)) ? 0x99 : 0x66;
                        imageData.data[pos++] = j;
                        imageData.data[pos++] = j;
                        imageData.data[pos++] = j;
                        imageData.data[pos++] = 0xFF;
                        break;

                    // HBlank/border
                    case 2:
                        if (x < 50 || x >= right_hbl) {
                            mode = 2;
                            j = ((y&4) ^ (x&4)) ? 0x99 : 0x66;
                            imageData.data[pos++] = j;
                            imageData.data[pos++] = j;
                            imageData.data[pos++] = j;
                        } else {
                            mode = 3;
                            imageData.data[pos++] = this.colors[this.BORDER][0];
                            imageData.data[pos++] = this.colors[this.BORDER][1];
                            imageData.data[pos++] = this.colors[this.BORDER][2];
                        }
                        imageData.data[pos++] = 0xFF;
                        break;

                    // HBlank/border/screen data
                    case 3:
                        if (x < left_hbl || x >= right_hbl) {
                            mode = 2;
                            j = ((y&4) ^ (x&4)) ? 0x99 : 0x66;
                            imageData.data[pos++] = j;
                            imageData.data[pos++] = j;
                            imageData.data[pos++] = j;
                        } else if (x < left_border || x >= right_border || !this.DISPLAY) {
                            mode = 3;
                            imageData.data[pos++] = this.colors[this.BORDER][0];
                            imageData.data[pos++] = this.colors[this.BORDER][1];
                            imageData.data[pos++] = this.colors[this.BORDER][2];
                        } else {
                            mode = 4;

                            // Background
                            imageData.data[pos+0] = this.colors[this.BG0][0];
                            imageData.data[pos+1] = this.colors[this.BG0][1];
                            imageData.data[pos+2] = this.colors[this.BG0][2];

                            // Sprites wot live below the text
                            for (j = 7; j >= 0; j--) {
                                if (this.SPR[j].on && this.SPR[j].below_bg) {
                                    px = this.SPR[j].x + (this.SPR[j].double_x ? 48 : 24);
                                    py = this.SPR[j].y + (this.SPR[j].double_y ? 42 : 21);
                                    if (
                                      x >= this.SPR[j].x && x < px &&
                                      y >= this.SPR[j].y && y < py
                                    ) {
                                        p = x - this.SPR[j].x;
                                        if (this.SPR[j].double_x) {
                                            p >>= 1;
                                        }
                                        if (this.curLineSpr[j * 3 + (p >> 3)] & this.bitPositions[p & 7]) {
                                            imageData.data[pos+0] = this.colors[this.SPR[j].col][0];
                                            imageData.data[pos+1] = this.colors[this.SPR[j].col][1];
                                            imageData.data[pos+2] = this.colors[this.SPR[j].col][2];
                                        }
                                    }
                                }
                            }

                            // Text
                            j = this.r(charBase + this.curLineScr[sx >> 3] * 8 + cy);
                            if (
                              (y >= top_border && y < bottom_border) &&
                              (j & this.bitPositions[cx])
                            ) {
                                j = this.curLineCol[sx >> 3];
                                imageData.data[pos+0] = this.colors[j][0];
                                imageData.data[pos+1] = this.colors[j][1];
                                imageData.data[pos+2] = this.colors[j][2];
                            }

                            // Sprites above the text
                            for (j = 7; j >= 0; j--) {
                                if (this.SPR[j].on && !this.SPR[j].below_bg) {
                                    px = this.SPR[j].x + (this.SPR[j].double_x ? 48 : 24);
                                    py = this.SPR[j].y + (this.SPR[j].double_y ? 42 : 21);
                                    if (
                                      x >= this.SPR[j].x && x < px &&
                                      y >= this.SPR[j].y && y < py
                                    ) {
                                        p = x - this.SPR[j].x;
                                        if (this.SPR[j].double_x) {
                                            p >>= 1;
                                        }
                                        if (this.curLineSpr[j * 3 + (p >> 3)] & this.bitPositions[p & 7]) {
                                            imageData.data[pos+0] = this.colors[this.SPR[j].col][0];
                                            imageData.data[pos+1] = this.colors[this.SPR[j].col][1];
                                            imageData.data[pos+2] = this.colors[this.SPR[j].col][2];
                                        }
                                    }
                                }
                            }

                            pos += 3;
                        }

                        imageData.data[pos++] = 0xFF;
                        break;
                }
                
                x++; i++; step++;
                if (x == this.sizes.RASTER_LENGTH) {
                    x = 0;
                    y++;

                    // Update the raster register in 'hardware'
                    this.registers[this.rg.RASTER] = y & 255;
                    this.registers[this.rg.FLAGS0] = (y & 256) ?
                        (this.registers[this.rg.FLAGS0] | 128) :
                        (this.registers[this.rg.FLAGS0] & 127);

                    if ((this.IRM & 1) && this.RASTERHIT == y) {
                        this.registers[this.rg.IRQ] |= 0x81;
                        this.owner.CPU.signal('INT');
                    }
                }

                if (step == 8) {
                    step = 0;
                    this.owner.CPU.step();
                }
            } while (i < pixels);

            this.backContext.putImageData(imageData, 0, 0);
            return mode;
        },
        getState: function() {
            var ret = {
                image: this.backContext.getImageData(0, 0, this.sizes.RASTER_LENGTH, this.sizes.RASTER_COUNT),
                colorRam: new Uint8Array(this.colorRam),
                registers: this.registers.slice(0)
            };

            // TODO: These in the kernel ROM instead
            this.rasterbarsValues = [];
            for (i = 0; i < this.sizes.RASTER_COUNT; i+=8) {
                this.rasterbarsValues.push(Math.floor(Math.random()*16));
            }
            if (this.effects.scrollshake) {
                this.XSCROLL = Math.floor(Math.random() * 8);
                this.YSCROLL = Math.floor(Math.random() * 8);
            }
            return ret;
        },
        setState: function(state) {
            this.backContext.putImageData(state.image, 0, 0);
            this.colorRam = new Uint8Array(state.colorRam);
            for (i in state.registers) {
                this.io_w(i, state.registers[i]);
            }
        },
        fillRasterModes: function() {
            var i, j;
            for (i = 0, j = 0; i < this.sizes.VBLT; i++, j++) {
                this.rasterModes[j] = 1;
            }
            for (i = 0; i < this.sizes.BORDERV; i++, j++) {
                this.rasterModes[j] = 2;
            }
            for (i = 0; i < this.sizes.HEIGHT; i++, j++) {
                this.rasterModes[j] = 3;
            }
            for (i = 0; i < this.sizes.BORDERV; i++, j++) {
                this.rasterModes[j] = 2;
            }
            for (i = 0; i < this.sizes.VBLB; i++, j++) {
                this.rasterModes[j] = 1;
            }
        },
        fillSpriteRasters: function() {
            var i, j, k;
            for (i = 0; i < this.sizes.RASTER_COUNT; i++) {
                this.spriteRasters[i].length = 0;
            }
            for (i = 0; i < 8; i++) {
                if (this.SPR[i].on) {
                    k = this.SPR[i].double_y ? 42 : 21;
                    for (j = this.SPR[i].y; j < (this.SPR[i].y + k); j++) {
                        this.spriteRasters[j].push(i);
                    }
                }
            }
        },
        reset: function() {
            var i, j;
            for (i = 0; i < 8; i++) {
                this.SPR[i] = {
                    x: this.sizes.HBL + this.sizes.BORDER - 24,
                    y: 0,
                    col: 0,
                    on: false,
                    double_x: false,
                    double_y: false,
                    multicolor: false,
                    below_bg: false,
                    hit: false,
                    hit_bg: false
                };
            }
            for (i = 0; i < this.sizes.RASTER_COUNT; i++) {
                this.spriteRasters[i] = [];
            }
            
            this.renderedFrames = {};
            this.backContext.fillStyle = 'black';
            this.backContext.fillRect(0, 0, this.sizes.RASTER_LENGTH, this.sizes.RASTER_COUNT);

            for (i in this.effects) {
                this.effects[i] = false;
            }
        },
        init: function() {
            this.sizes.RASTER_LENGTH = this.sizes.HBL + this.sizes.BORDERL + this.sizes.WIDTH + this.sizes.BORDERR + this.sizes.HBL;
            this.sizes.RASTER_COUNT = this.sizes.VBLT + this.sizes.BORDERV + this.sizes.HEIGHT + this.sizes.BORDERV + this.sizes.VBLB;
            this.sizes.FRAME_SIZE = this.sizes.RASTER_LENGTH * this.sizes.RASTER_COUNT;

            this.colorRam = new Uint8Array(1000);
            this.curLineScr = new Uint8Array(40);
            this.curLineCol = new Uint8Array(40);
            this.curLineSpr = new Uint8Array(24);
            this.SPR = [];

            this.backCanvas = document.createElement('canvas');
            this.backCanvas.width = this.sizes.RASTER_LENGTH;
            this.backCanvas.height = this.sizes.RASTER_COUNT;
            this.backContext = this.backCanvas.getContext('2d');

            this.reset();
        },

        registers: [
            0, // Sprite 0: X
            0, // Sprite 0: Y
            0, // Sprite 1: X
            0, // Sprite 1: Y
            0, // Sprite 2: X
            0, // Sprite 2: Y
            0, // Sprite 3: X
            0, // Sprite 3: Y
            0, // Sprite 4: X
            0, // Sprite 4: Y
            0, // Sprite 5: X
            0, // Sprite 5: Y
            0, // Sprite 6: X
            0, // Sprite 6: Y
            0, // Sprite 7: X
            0, // Sprite 7: Y
            0, // Sprite X coordinate MSBs
            0, // Flags One
            0, // Current raster
            0, // Light pen X
            0, // Light pen Y
            0, // Sprite enable flags
            0, // Flags Two
            0, // Sprite Y-double flags
            0, // Pointers
            0, // Interrupt flags
            0, // Interrupt enables
            0, // Sprite priority
            0, // Sprite multicolor flags
            0, // Sprite X-double flags
            0, // Sprite-sprite collision
            0, // Sprite-bg collision
            0, // Color: border
            0, // Color: BG 0
            0, // Color: BG 1
            0, // Color: BG 2
            0, // Color: BG 3
            0, // Color: Sprite multi 0
            0, // Color: Sprite multi 1
            0, // Color: Sprite 0
            0, // Color: Sprite 1
            0, // Color: Sprite 2
            0, // Color: Sprite 3
            0, // Color: Sprite 4
            0, // Color: Sprite 5
            0, // Color: Sprite 6
            0  // Color: Sprite 7
        ],

        rg: {
            SPRX0:     0,
            SPRY0:     1,
            SPRX1:     2,
            SPRY1:     3,
            SPRX2:     4,
            SPRY2:     5,
            SPRX3:     6,
            SPRY3:     7,
            SPRX4:     8,
            SPRY4:     9,
            SPRX5:    10,
            SPRY5:    11,
            SPRX6:    12,
            SPRY6:    13,
            SPRX7:    14,
            SPRY7:    15,
            SPRXHI:   16,
            FLAGS1:   17,
            RASTER:   18,
            LPX:      19,
            LPY:      20,
            SPREN:    21,
            FLAGS2:   22,
            SPRDBLY:  23,
            POINTERS: 24,
            IRQ:      25,
            IRM:      26,
            SPROVER:  27,
            SPRMM:    28,
            SPRDBLX:  29,
            SPRCOLL:  30,
            SPRBGCOLL:31,
            BORDER:   32,
            BG0:      33,
            BG1:      34,
            BG2:      35,
            BG3:      36,
            SPRMM0:   37,
            SPRMM1:   38,
            SPRC0:    39,
            SPRC1:    40,
            SPRC2:    41,
            SPRC3:    42,
            SPRC4:    43,
            SPRC5:    44,
            SPRC6:    45,
            SPRC7:    46
        },
        sizes: {
            HBL: 50,
            VBLT: 17,
            VBLB: 11,
            BORDER: 42,
            BORDERV: 42,
            BORDERL: 42,
            BORDERR: 42,
            WIDTH: 320,
            HEIGHT: 200,
            WIDTH_ORIG: 320,
            HEIGHT_ORIG: 200
        },
        colors: [
            [0x00, 0x00, 0x00], // black
            [0xFF, 0xFF, 0xFF], // white
            [0x88, 0x00, 0x00], // red
            [0xAA, 0xFF, 0xEE], // cyan
            [0xCC, 0x44, 0xCC], // magenta
            [0x00, 0xCC, 0x55], // green
            [0x00, 0x00, 0xAA], // blue
            [0xEE, 0xEE, 0x77], // yellow
            [0xDD, 0x88, 0x55], // orange
            [0x66, 0x44, 0x00], // brown
            [0xFF, 0x77, 0x77], // light red
            [0x33, 0x33, 0x33], // grey 1
            [0x77, 0x77, 0x77], // grey 2
            [0xAA, 0xFF, 0x66], // light green
            [0x00, 0x88, 0xFF], // light blue
            [0xBB, 0xBB, 0xBB]  // grey 3
        ],
        bitPositions: [128, 64, 32, 16, 8, 4, 2, 1],
        endpointStrings: [
            'Offline',
            'Vertical blanking',
            'Horizontal blanking',
            'Border',
            'Screen'
        ]
    };
});
