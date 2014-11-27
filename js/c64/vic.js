define(function() {
    return {
        effects: {
            rasterbars: false,
            scrollshake: false
        },
        colorRam: null,
        charRom: null,
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

        SPR:        null,

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
                    if (this.RSEL) {
                        this.sizes.BORDERV = 42;
                        this.sizes.HEIGHT = 200;
                    } else {
                        this.sizes.BORDERV = 46;
                        this.sizes.HEIGHT = 192;
                    }
                    this.fillRasterModes();
                    break;
                case 18: // RASTER is readonly
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
                case 25: // IRQ is readonly
                    break;
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
            var i = 0, j, k, p, x = 0, y = 0, pos = 0, scanmode = 0, row = 0;
            var sx, sy, cx, cy, px, py;
            var loc = 0, locBase = this.owner.MMU.vicBank * 16384 + this.SCREENPTR * 1024;
            var left_hbl, right_hbl, left_border, right_border;
            var top_border = this.sizes.VBLT + this.sizes.BORDER,
                bottom_border = this.sizes.VBLT + this.sizes.BORDER + this.sizes.HEIGHT_ORIG;

            var imageData = this.backContext.getImageData(0, 0, this.sizes.RASTER_LENGTH, this.sizes.RASTER_COUNT);

            // Bit of a hack...
            for (j = 0; j < 40; j++) {
                this.curLineScr[j] = 32;
            }

            do {
                if (x == 0 && this.effects.rasterbars) {
                    this.io_w(this.rg.BORDER, this.rasterbarsValues[y>>3]);
                }

                left_hbl = this.sizes.HBL;
                right_hbl = this.sizes.RASTER_LENGTH - this.sizes.HBL;
                left_border = this.sizes.HBL + this.sizes.BORDERL;
                right_border = this.sizes.RASTER_LENGTH - this.sizes.BORDERR - this.sizes.HBL;

                // Character-mode badline, locks the bus for 40 phi-1 cycles
                if (y >= top_border && y < bottom_border) {
                    sx = x - this.sizes.HBL - this.sizes.BORDER - this.XSCROLL;
                    sy = y - this.sizes.VBLT - this.sizes.BORDER - this.YSCROLL;

                    cx = sx & 7;
                    cy = (y - this.YSCROLL) & 7;

                    if (sx == 0 && cy == 0) {
                        if (row < 25) {
                            this.owner.MMU.busLock += 40;
                            for (j = 0; j < 40; j++) {
                                this.curLineScr[j] = this.owner.MMU.ram[locBase + loc];
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
                    if (x > (this.sizes.RASTER_LENGTH - this.sizes.HBL)) {
                        for (j in this.spriteRasters[y + 1]) {
                            this.owner.MMU.busLock += 2;
                            k = this.spriteRasters[y + 1][j];
                            p = this.owner.MMU.ram[locBase + 1016 + k];
                            py = y + 1 - this.SPR[k].y;
                            if (this.SPR[k].double_y) {
                                py >>= 1;
                            }
                            py = this.owner.MMU.vicBank * 16384 + p * 64 + py * 3;

                            this.curLineSpr[k * 3 + 0] = this.owner.MMU.ram[py + 0];
                            this.curLineSpr[k * 3 + 1] = this.owner.MMU.ram[py + 1];
                            this.curLineSpr[k * 3 + 2] = this.owner.MMU.ram[py + 2];
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
                            j = this.charRom[this.curLineScr[sx >> 3] * 8 + cy];
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
                
                x++; i++;
                if (x == this.sizes.RASTER_LENGTH) {
                    x = 0;
                    y++;

                    // Update the raster register in 'hardware'
                    this.registers[this.rg.RASTER] = y & 255;
                    this.registers[this.rg.FLAGS0] = (y & 256) ?
                        (this.registers[this.rg.FLAGS0] | 128) :
                        (this.registers[this.rg.FLAGS0] & 127);
                }
            } while (i < pixels);

            this.backContext.putImageData(imageData, 0, 0);
            return mode;
        },
        saveFrame: function(frame, numFrames) {
            var i;
            if (this.renderedFrames[frame]) {
                return;
            }
            if (numFrames > 2) {
                numFrames = 2;
            }
            this.renderedFrames[frame] = this.backContext.getImageData(0, 0, this.sizes.RASTER_LENGTH, this.sizes.RASTER_COUNT);
            for (i in this.renderedFrames) {
                if (i > 0 && i < (frame - numFrames)) {
                    delete this.renderedFrames[i];
                }
            }
            this.rasterbarsValues = [];
            for (i = 0; i < this.sizes.RASTER_COUNT; i+=8) {
                this.rasterbarsValues.push(Math.floor(Math.random()*16));
            }
            if (this.effects.scrollshake) {
                this.XSCROLL = Math.floor(Math.random() * 8);
                this.YSCROLL = Math.floor(Math.random() * 8);
            }
        },
        restoreFrame: function(frame) {
            if (!this.renderedFrames[frame]) {
                frame = 0;
            }
            this.backContext.putImageData(this.renderedFrames[frame], 0, 0);
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
            
            this.io_w(this.rg.FLAGS1, 0x9B);
            this.io_w(this.rg.FLAGS2, 0x08);
            this.io_w(this.rg.POINTERS, 0x14);
            this.io_w(this.rg.IRQ, 0x0F);
            this.io_w(this.rg.BORDER, 0x0E);
            this.io_w(this.rg.BG0, 0x06);

            for (i = 0, j = this.charRomSrc.match(/.{2}/g); i < 4096; i++) {
                this.charRom[i] = parseInt(j[i], 16);
            }
            for (i = 0; i < 25; i++) {
                for (j = 0; j < 40; j++) {
                    this.owner.MMU.ram[this.SCREENPTR * 1024 + i * 40 + j] = this.initialScreen[i].charCodeAt(j) - 64;
                    this.colorRam[i * 40 + j] = 14;
                }
            }
            this.owner.MMU.ram[this.SCREENPTR * 1024 + 240] = 224;

            this.backContext.fillStyle = 'black';
            this.backContext.fillRect(0, 0, this.sizes.RASTER_LENGTH, this.sizes.RASTER_COUNT);
            this.saveFrame(0, 1);

            for (i in this.effects) {
                this.effects[i] = false;
            }

            // Test sprite
            j = [
                0, 126, 0, 3, 255, 192, 7, 255, 224,
                31, 255, 248, 31, 255, 248, 63, 255, 252,
                127, 255, 254, 127, 254, 254, 255, 253, 255,
                255, 251, 255, 255, 247, 255, 255, 239, 255,
                255, 223, 255, 127, 191, 254, 127, 127, 254,
                63, 255, 252, 31, 255, 248, 31, 255, 248,
                7, 255, 224, 3, 255, 192, 0, 126, 0
            ];
            for (i = 0; i < 63; i++) {
                this.owner.MMU.ram[0x3FC0 + i] = j[i];
            }
            this.owner.MMU.ram[this.SCREENPTR * 1024 + 1016] = 0xFF;
            this.io_w(this.rg.SPRX0, 150);
            this.io_w(this.rg.SPRY0, 150);
            this.io_w(this.rg.SPRC0, 7);
        },
        init: function() {
            this.sizes.RASTER_LENGTH = this.sizes.HBL + this.sizes.BORDERL + this.sizes.WIDTH + this.sizes.BORDERR + this.sizes.HBL;
            this.sizes.RASTER_COUNT = this.sizes.VBLT + this.sizes.BORDERV + this.sizes.HEIGHT + this.sizes.BORDERV + this.sizes.VBLB;
            this.sizes.FRAME_SIZE = this.sizes.RASTER_LENGTH * this.sizes.RASTER_COUNT;

            this.colorRam = new Uint8Array(1000);
            this.charRom = new Uint8Array(4096);
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
        ],
        initialScreen: [
            '````````````````````````````````````````',
            '````jjjj`COMMODORE`vt`BASIC`Vr`jjjj`````',
            '````````````````````````````````````````',
            '`vtK`RAM`SYSTEM``sxyqq`BASIC`BYTES`FREE`',
            '````````````````````````````````````````',
            'READYn``````````````````````````````````',
            '````````````````````````````````````````',
            '````````````````````````````````````````',
            '````````````````````````````````````````',
            '````````````````````````````````````````',
            '````````````````````````````````````````',
            '````````````````````````````````````````',
            '````````````````````````````````````````',
            '````````````````````````````````````````',
            '````````````````````````````````````````',
            '````````````````````````````````````````',
            '````````````````````````````````````````',
            '````````````````````````````````````````',
            '````````````````````````````````````````',
            '````````````````````````````````````````',
            '````````````````````````````````````````',
            '````````````````````````````````````````',
            '````````````````````````````````````````',
            '````````````````````````````````````````',
            '````````````````````````````````````````',
        ],
        charRomSrc: [
            '3c666e6e60623c00183c667e666666007c66667c66667c003c66606060663c00',
            '786c6666666c78007e60607860607e007e606078606060003c66606e66663c00',
            '6666667e666666003c18181818183c001e0c0c0c0c6c3800666c7870786c6600',
            '6060606060607e0063777f6b6363630066767e7e6e6666003c66666666663c00',
            '7c66667c606060003c666666663c0e007c66667c786c66003c66603c06663c00',
            '7e181818181818006666666666663c0066666666663c18006363636b7f776300',
            '66663c183c6666006666663c181818007e060c1830607e003c30303030303c00',
            '0c12307c3062fc003c0c0c0c0c0c3c0000183c7e181818180010307f7f301000',
            '0000000000000000181818180000180066666600000000006666ff66ff666600',
            '183e603c067c180062660c18306646003c663c3867663f00060c180000000000',
            '0c18303030180c0030180c0c0c18300000663cff3c6600000018187e18180000',
            '00000000001818300000007e0000000000000000001818000003060c18306000',
            '3c666e7666663c001818381818187e003c66060c30607e003c66061c06663c00',
            '060e1e667f0606007e607c0606663c003c66607c66663c007e660c1818181800',
            '3c66663c66663c003c66663e06663c0000001800001800000000180000181830',
            '0e18306030180e0000007e007e00000070180c060c1870003c66060c18001800',
            '000000ffff000000081c3e7f7f1c3e001818181818181818000000ffff000000',
            '0000ffff0000000000ffff000000000000000000ffff00003030303030303030',
            '0c0c0c0c0c0c0c0c000000e0f038181818181c0f07000000181838f0e0000000',
            'c0c0c0c0c0c0ffffc0e070381c0e070303070e1c3870e0c0ffffc0c0c0c0c0c0',
            'ffff030303030303003c7e7e7e7e3c000000000000ffff00367f7f7f3e1c0800',
            '6060606060606060000000070f1c1818c3e77e3c3c7ee7c3003c7e66667e3c00',
            '1818666618183c000606060606060606081c3e7f3e1c0800181818ffff181818',
            'c0c03030c0c0303018181818181818180000033e76363600ff7f3f1f0f070301',
            '0000000000000000f0f0f0f0f0f0f0f000000000ffffffffff00000000000000',
            '00000000000000ffc0c0c0c0c0c0c0c0cccc3333cccc33330303030303030303',
            '00000000cccc3333fffefcf8f0e0c08003030303030303031818181f1f181818',
            '000000000f0f0f0f1818181f1f000000000000f8f8181818000000000000ffff',
            '0000001f1f181818181818ffff000000000000ffff181818181818f8f8181818',
            'c0c0c0c0c0c0c0c0e0e0e0e0e0e0e0e00707070707070707ffff000000000000',
            'ffffff00000000000000000000ffffff030303030303ffff00000000f0f0f0f0',
            '0f0f0f0f00000000181818f8f8000000f0f0f0f000000000f0f0f0f00f0f0f0f',
            'c39991919f99c3ffe7c39981999999ff83999983999983ffc3999f9f9f99c3ff',
            '87939999999387ff819f9f879f9f81ff819f9f879f9f9fffc3999f919999c3ff',
            '99999981999999ffc3e7e7e7e7e7c3ffe1f3f3f3f393c7ff9993878f879399ff',
            '9f9f9f9f9f9f81ff9c8880949c9c9cff99898181919999ffc39999999999c3ff',
            '839999839f9f9fffc399999999c3f1ff83999983879399ffc3999fc3f999c3ff',
            '81e7e7e7e7e7e7ff999999999999c3ff9999999999c3e7ff9c9c9c9480889cff',
            '9999c3e7c39999ff999999c3e7e7e7ff81f9f3e7cf9f81ffc3cfcfcfcfcfc3ff',
            'f3edcf83cf9d03ffc3f3f3f3f3f3c3ffffe7c381e7e7e7e7ffefcf8080cfefff',
            'ffffffffffffffffe7e7e7e7ffffe7ff999999ffffffffff99990099009999ff',
            'e7c19fc3f983e7ff9d99f3e7cf99b9ffc399c3c79899c0fff9f3e7ffffffffff',
            'f3e7cfcfcfe7f3ffcfe7f3f3f3e7cfffff99c300c399ffffffe7e781e7e7ffff',
            'ffffffffffe7e7cfffffff81ffffffffffffffffffe7e7fffffcf9f3e7cf9fff',
            'c39991899999c3ffe7e7c7e7e7e781ffc399f9f3cf9f81ffc399f9e3f999c3ff',
            'f9f1e19980f9f9ff819f83f9f999c3ffc3999f839999c3ff8199f3e7e7e7e7ff',
            'c39999c39999c3ffc39999c1f999c3ffffffe7ffffe7ffffffffe7ffffe7e7cf',
            'f1e7cf9fcfe7f1ffffff81ff81ffffff8fe7f3f9f3e78fffc399f9f3e7ffe7ff',
            'ffffff0000fffffff7e3c18080e3c1ffe7e7e7e7e7e7e7e7ffffff0000ffffff',
            'ffff0000ffffffffff0000ffffffffffffffffff0000ffffcfcfcfcfcfcfcfcf',
            'f3f3f3f3f3f3f3f3ffffff1f0fc7e7e7e7e7e3f0f8ffffffe7e7c70f1fffffff',
            '3f3f3f3f3f3f00003f1f8fc7e3f1f8fcfcf8f1e3c78f1f3f00003f3f3f3f3f3f',
            '0000fcfcfcfcfcfcffc381818181c3ffffffffffff0000ffc9808080c1e3f7ff',
            '9f9f9f9f9f9f9f9ffffffff8f0e3e7e73c1881c3c381183cffc381999981c3ff',
            'e7e79999e7e7c3fff9f9f9f9f9f9f9f9f7e3c180c1e3f7ffe7e7e70000e7e7e7',
            '3f3fcfcf3f3fcfcfe7e7e7e7e7e7e7e7fffffcc189c9c9ff0080c0e0f0f8fcfe',
            'ffffffffffffffff0f0f0f0f0f0f0f0fffffffff0000000000ffffffffffffff',
            'ffffffffffffff003f3f3f3f3f3f3f3f3333cccc3333ccccfcfcfcfcfcfcfcfc',
            'ffffffff3333cccc000103070f1f3f7ffcfcfcfcfcfcfcfce7e7e7e0e0e7e7e7',
            'fffffffff0f0f0f0e7e7e7e0e0ffffffffffff0707e7e7e7ffffffffffff0000',
            'ffffffe0e0e7e7e7e7e7e70000ffffffffffff0000e7e7e7e7e7e70707e7e7e7',
            '3f3f3f3f3f3f3f3f1f1f1f1f1f1f1f1ff8f8f8f8f8f8f8f80000ffffffffffff',
            '000000ffffffffffffffffffff000000fcfcfcfcfcfc0000ffffffff0f0f0f0f',
            'f0f0f0f0ffffffffe7e7e70707ffffff0f0f0f0fffffffff0f0f0f0ff0f0f0f0',
            '3c666e6e60623c0000003c063e663e000060607c66667c0000003c6060603c00',
            '0006063e66663e0000003c667e603c00000e183e1818180000003e66663e067c',
            '0060607c666666000018003818183c00000600060606063c0060606c786c6600',
            '0038181818183c000000667f7f6b630000007c666666660000003c6666663c00',
            '00007c66667c606000003e66663e060600007c666060600000003e603c067c00',
            '00187e1818180e000000666666663e0000006666663c18000000636b7f3e3600',
            '0000663c183c660000006666663e0c7800007e0c18307e003c30303030303c00',
            '0c12307c3062fc003c0c0c0c0c0c3c0000183c7e181818180010307f7f301000',
            '0000000000000000181818180000180066666600000000006666ff66ff666600',
            '183e603c067c180062660c18306646003c663c3867663f00060c180000000000',
            '0c18303030180c0030180c0c0c18300000663cff3c6600000018187e18180000',
            '00000000001818300000007e0000000000000000001818000003060c18306000',
            '3c666e7666663c001818381818187e003c66060c30607e003c66061c06663c00',
            '060e1e667f0606007e607c0606663c003c66607c66663c007e660c1818181800',
            '3c66663c66663c003c66663e06663c0000001800001800000000180000181830',
            '0e18306030180e0000007e007e00000070180c060c1870003c66060c18001800',
            '000000ffff000000183c667e666666007c66667c66667c003c66606060663c00',
            '786c6666666c78007e60607860607e007e606078606060003c66606e66663c00',
            '6666667e666666003c18181818183c001e0c0c0c0c6c3800666c7870786c6600',
            '6060606060607e0063777f6b6363630066767e7e6e6666003c66666666663c00',
            '7c66667c606060003c666666663c0e007c66667c786c66003c66603c06663c00',
            '7e181818181818006666666666663c0066666666663c18006363636b7f776300',
            '66663c183c6666006666663c181818007e060c1830607e00181818ffff181818',
            'c0c03030c0c0303018181818181818183333cccc3333cccc3399cc663399cc66',
            '0000000000000000f0f0f0f0f0f0f0f000000000ffffffffff00000000000000',
            '00000000000000ffc0c0c0c0c0c0c0c0cccc3333cccc33330303030303030303',
            '00000000cccc3333cc993366cc99336603030303030303031818181f1f181818',
            '000000000f0f0f0f1818181f1f000000000000f8f8181818000000000000ffff',
            '0000001f1f181818181818ffff000000000000ffff181818181818f8f8181818',
            'c0c0c0c0c0c0c0c0e0e0e0e0e0e0e0e00707070707070707ffff000000000000',
            'ffffff00000000000000000000ffffff0103066c7870600000000000f0f0f0f0',
            '0f0f0f0f00000000181818f8f8000000f0f0f0f000000000f0f0f0f00f0f0f0f',
            'c39991919f99c3ffffffc3f9c199c1ffff9f9f83999983ffffffc39f9f9fc3ff',
            'fff9f9c19999c1ffffffc399819fc3fffff1e7c1e7e7e7ffffffc19999c1f983',
            'ff9f9f83999999ffffe7ffc7e7e7c3fffff9fff9f9f9f9c3ff9f9f93879399ff',
            'ffc7e7e7e7e7c3ffffff998080949cffffff8399999999ffffffc3999999c3ff',
            'ffff839999839f9fffffc19999c1f9f9ffff83999f9f9fffffffc19fc3f983ff',
            'ffe781e7e7e7f1ffffff99999999c1ffffff999999c3e7ffffff9c9480c1c9ff',
            'ffff99c3e7c399ffffff999999c1f387ffff81f3e7cf81ffc3cfcfcfcfcfc3ff',
            'f3edcf83cf9d03ffc3f3f3f3f3f3c3ffffe7c381e7e7e7e7ffefcf8080cfefff',
            'ffffffffffffffffe7e7e7e7ffffe7ff999999ffffffffff99990099009999ff',
            'e7c19fc3f983e7ff9d99f3e7cf99b9ffc399c3c79899c0fff9f3e7ffffffffff',
            'f3e7cfcfcfe7f3ffcfe7f3f3f3e7cfffff99c300c399ffffffe7e781e7e7ffff',
            'ffffffffffe7e7cfffffff81ffffffffffffffffffe7e7fffffcf9f3e7cf9fff',
            'c39991899999c3ffe7e7c7e7e7e781ffc399f9f3cf9f81ffc399f9e3f999c3ff',
            'f9f1e19980f9f9ff819f83f9f999c3ffc3999f839999c3ff8199f3e7e7e7e7ff',
            'c39999c39999c3ffc39999c1f999c3ffffffe7ffffe7ffffffffe7ffffe7e7cf',
            'f1e7cf9fcfe7f1ffffff81ff81ffffff8fe7f3f9f3e78fffc399f9f3e7ffe7ff',
            'ffffff0000ffffffe7c39981999999ff83999983999983ffc3999f9f9f99c3ff',
            '87939999999387ff819f9f879f9f81ff819f9f879f9f9fffc3999f919999c3ff',
            '99999981999999ffc3e7e7e7e7e7c3ffe1f3f3f3f393c7ff9993878f879399ff',
            '9f9f9f9f9f9f81ff9c8880949c9c9cff99898181919999ffc39999999999c3ff',
            '839999839f9f9fffc399999999c3f1ff83999983879399ffc3999fc3f999c3ff',
            '81e7e7e7e7e7e7ff999999999999c3ff9999999999c3e7ff9c9c9c9480889cff',
            '9999c3e7c39999ff999999c3e7e7e7ff81f9f3e7cf9f81ffe7e7e70000e7e7e7',
            '3f3fcfcf3f3fcfcfe7e7e7e7e7e7e7e7cccc3333cccc3333cc663399cc663399',
            'ffffffffffffffff0f0f0f0f0f0f0f0fffffffff0000000000ffffffffffffff',
            'ffffffffffffff003f3f3f3f3f3f3f3f3333cccc3333ccccfcfcfcfcfcfcfcfc',
            'ffffffff3333cccc3366cc993366cc99fcfcfcfcfcfcfcfce7e7e7e0e0e7e7e7',
            'fffffffff0f0f0f0e7e7e7e0e0ffffffffffff0707e7e7e7ffffffffffff0000',
            'ffffffe0e0e7e7e7e7e7e70000ffffffffffff0000e7e7e7e7e7e70707e7e7e7',
            '3f3f3f3f3f3f3f3f1f1f1f1f1f1f1f1ff8f8f8f8f8f8f8f80000ffffffffffff',
            '000000ffffffffffffffffffff000000fefcf993878f9fffffffffff0f0f0f0f',
            'f0f0f0f0ffffffffe7e7e70707ffffff0f0f0f0fffffffff0f0f0f0ff0f0f0f0'
        ].join('')
    };
});
