define(function() {
    return {
        IEC_ID: 8,
        iec: {
            state: null,
            statetime: null,
            eoi: null,
            prevclk: null,
            prevatn: null,
            data: null,
            bitpos: null,
            dataready: null,
            datalast: null
        },

        listening: false,
        talking: false,
        currCommand: null,
        currChannel: null,
        currFilename: [],
        currFilePos: null,

        directory: [
            {
                name: 'foo',
                length: 26,
                data: [
                    0x01,0x08,0x0e,0x08,0x0a,0x00,0x99,0x22,0x48,0x45,
                    0x4c,0x4c,0x4f,0x22,0x00,0x17,0x08,0x14,0x00,0x89,
                    0x20,0x31,0x30,0x00,0x00,0x00
                ]
            }
        ],

        command: function() {
            switch (this.iec.data & 0xF0) {
                case 0x20:
                    if ((this.iec.data & 0x0F) == this.IEC_ID) {
                        this.listening = true;
                        this.currCommand = '';
                    }
                    break;
                case 0x30:
                    this.listening = false;
                    this.currCommand = '';
                    break;
                case 0x40:
                    if ((this.iec.data & 0x0F) == this.IEC_ID) {
                        this.talking = true;
                    }
                    break;
                case 0x50:
                    this.talking = false;
                    break;
                case 0x60:
                    // DATA
                    if (this.listening) {
                        this.currCommand = 'DATA';
                    }
                    break;
                case 0xE0:
                    // CLOSE
                    if (this.listening) {
                        this.currCommand = 'CLOSE';
                    }
                    break;
                case 0xF0:
                    // OPEN
                    if (this.listening) {
                        this.currCommand = 'OPEN';
                        this.currChannel = this.iec.data & 0x0F;
                        this.currFilename.length = 0;
                        this.currFilePos = 0;
                    }
                    break;
            }
        },
        recv: function() {
            if (this.listening) {
                switch (this.currCommand) {
                    case 'OPEN':
                        this.currFilename.push(this.iec.data);
                        break;
                }
            }
        },
        send: function() {
            if (this.talking) {
                if (this.currFilePos < this.directory[0].length) {
                    this.iec.dataready = true;
                    this.iec.data = this.directory[0].data[this.currFilePos++];
                    if (this.currFilePos == this.directory[0].length) {
                        this.iec.datalast = true;
                    }
                } else {
                    this.iec.dataready = false;
                }
            }
        },
        getState: function() {
            return {
                iec: $.extend({}, this.iec),
                listening: this.listening,
                talking: this.talking,
                currCommand: this.currCommand,
                currChannel: this.currChannel,
                currFilename: this.currFilename.slice(0),
                currFilePos: this.currFilePos
            };
        },
        setState: function(state) {
            this.iec = $.extend({}, state.iec);
            this.listening = state.listening;
            this.talking = state.talking;
            this.currCommand = state.currCommand;
            this.currChannel = state.currChannel;
            this.currFilename = state.currFilename.slice(0);
            this.currFilePos = state.currFilePos;
        },
        step: function() {
            var val, prevState = this.iec.state;
            this.iec.statetime++;

            if (!this.iec.prevatn && this.owner.IEC.check('ATN')) {
                // Hey! Hey disk! Hey disk, hey!
                this.iec.prevatn = true;
                this.iec.state = 16;
                this.iec.statetime = 0;
                return;
            }

            switch (this.iec.state) {
                // Initial state: waiting for talker
                case 0:
                    if (this.iec.prevclk && !this.owner.IEC.check('CLK')) {
                        // Talker has indicated Ready to Send
                        // We should indicate Ready to Listen
                        this.owner.IEC.log(this.IEC_ID, 'received Ready-to-send');
                        this.iec.state = 1;
                    }
                    break;

                // About to indicate ready-to-listen
                case 1:
                    if (this.iec.statetime >= 60) {
                        this.owner.IEC.log(this.IEC_ID, 'indicates Ready-to-listen');
                        this.owner.IEC.release(this.IEC_ID, 'DATA');
                        if (this.owner.IEC.check('DATA')) {
                            // DATA is still pulled after we released it
                            // Talker is indicating it wishes to turnaround
                            this.owner.IEC.log(this.IEC_ID, 'received turnaround');
                            this.iec.state = 6;
                            this.owner.IEC.pulldown(this.IEC_ID, 'CLK');
                        } else {
                            this.iec.state = 2;
                        }
                    }
                    break;

                // Awaiting data and/or EOI
                case 2:
                    if (this.owner.IEC.check('CLK')) {
                        // Talker will proceed to send
                        this.owner.IEC.log(this.IEC_ID, 'awaiting data');
                        this.iec.prevclk = true;
                        this.iec.state = 3;
                        this.iec.data = 0;
                        this.iec.bitpos = 0;
                    } else if (!this.iec.eoi && this.iec.statetime >= 200) {
                        // Over 200us have passed without CLK going high
                        // Talker is indicating End of Indicator
                        this.owner.IEC.log(this.IEC_ID, 'entering EOI');
                        this.owner.IEC.pulldown(this.IEC_ID, 'DATA');
                        this.iec.state = 7;
                    }
                    break;

                // Data reception
                case 3:
                    if (this.iec.prevclk && !this.owner.IEC.check('CLK')) {
                        // CLK rising edge, pull a bit
                        // Note that data levels are reversed
                        val = this.owner.IEC.check('DATA')
                                ? 0
                                : (1 << this.iec.bitpos);
                        this.owner.IEC.log(this.IEC_ID, 'got bit '+val);
                        this.iec.data |= val;
                    } else if (!this.iec.prevclk && this.owner.IEC.check('CLK')) {
                        // CLK falling edge, advance a bit
                        this.iec.bitpos++;
                        this.owner.IEC.log(this.IEC_ID, 'advancing');
                        if (this.iec.bitpos == 8) {
                            // Data is complete
                            this.owner.IEC.log(this.IEC_ID, 'received data '+this.iec.data);
                            this.iec.state = 4;
                        }
                    }
                    this.iec.prevclk = this.owner.IEC.check('CLK');
                    break;

                // End-of-byte ack
                case 4:
                    if (this.iec.statetime >= 60) {
                        // Acknowledge end of data, act thereon
                        this.owner.IEC.pulldown(this.IEC_ID, 'DATA');
                        this.iec.state = 5;

                        if (this.owner.IEC.check('ATN')) {
                            // Command issued
                            this.owner.IEC.log(this.IEC_ID, 'command '+this.iec.data);
                            this.command();
                        } else {
                            this.owner.IEC.log(this.IEC_ID, 'data '+this.iec.data);
                            this.recv();
                        }
                    }
                    break;

                // Post-byte timeout
                case 5:
                    if (this.iec.statetime >= 20) {
                        this.iec.state = 0;
                    }
                    break;

                // Post-turnaround timeout
                case 6:
                    if (this.iec.statetime >= 80) {
                        this.owner.IEC.log(this.IEC_ID, 'turned around');
                        this.owner.IEC.release(this.IEC_ID, 'DATA');
                        this.iec.state = 8;
                    }
                    break;

                // EOI ack
                case 7:
                    if (this.iec.statetime >= 60) {
                        // EOI has been acknowledged for 60us, await data
                        this.owner.IEC.log(this.IEC_ID, 'acknowledged EOI');
                        this.owner.IEC.release(this.IEC_ID, 'DATA');
                        this.iec.state = 2;
                        this.iec.eoi = true;
                    }
                    break;

                case 8:
                    if (this.iec.statetime >= 60) {
                        this.send();
                        if (this.iec.dataready) {
                            // Ready to send, await acknowledgement
                            this.owner.IEC.log(this.IEC_ID, 'ready to send');
                            this.owner.IEC.release(this.IEC_ID, 'CLK');
                            this.iec.state = 9;
                        }
                    }
                    break;
                case 9:
                    if (!this.owner.IEC.check('DATA')) {
                        // Ack'd, indicate EOI if necessary
                        if (this.iec.datalast) {
                            // Refuse to start data until EOI ack'd
                            this.owner.IEC.log(this.IEC_ID, 'awaiting EOI ack');
                            this.iec.state = 14;
                            this.iec.bitpos = 0;
                        } else {
                            // Ready to fire
                            if (this.iec.statetime >= 80) {
                                this.owner.IEC.log(this.IEC_ID, 'sending');
                                this.owner.IEC.pulldown(this.IEC_ID, 'CLK');
                                this.iec.state = 10;
                                this.iec.bitpos = 0;
                            }
                        }
                    }
                    break;
                case 10:
                    // Sending one bit
                    if (this.iec.statetime >= 60) {
                        val = (this.iec.data & (1 << this.iec.bitpos));
                        this.owner.IEC.log(this.IEC_ID, 'sending '+val+' at bit '+this.iec.bitpos);
                        this.owner.IEC[val ? 'release' : 'pulldown'](this.IEC_ID, 'DATA');
                        this.iec.state = 11;
                        this.iec.bitpos++;
                    }
                    break;
                case 11:
                    // Bit ready for latching
                    if (this.iec.statetime >= 60) {
                        this.owner.IEC.release(this.IEC_ID, 'CLK');
                        this.iec.state = 12;
                    }
                    break;
                case 12:
                    // Signalling end of bit
                    if (this.iec.statetime >= 60) {
                        this.owner.IEC.pulldown(this.IEC_ID, 'CLK');
                        this.owner.IEC.release(this.IEC_ID, 'DATA');
                        this.iec.state = (this.iec.bitpos < 8) ? 10 : 13;
                    }
                    break;
                case 13:
                    if (this.iec.statetime >= 20) {
                        if (this.owner.IEC.check('DATA')) {
                            this.owner.IEC.log(this.IEC_ID, 'byte acknowledged');
                            this.iec.state = 8;
                            if (this.iec.datalast) {
                                // Turnaround back to listening
                                this.owner.IEC.log(this.IEC_ID, 'turning back around');
                                this.owner.IEC.release(this.IEC_ID, 'CLK');
                                this.owner.IEC.pulldown(this.IEC_ID, 'DATA');
                                this.iec.state = 0;
                            }
                        }
                    }
                    break;
                case 14:
                    // EOI handshake, step 1: data high
                    if (this.owner.IEC.check('DATA')) {
                        this.iec.state = 15;
                    }
                    break;
                case 15:
                    // EOI handshake, step 2: data low again
                    if (!this.owner.IEC.check('DATA')) {
                        this.owner.IEC.pulldown(this.IEC_ID, 'CLK');
                        this.iec.state = 10;
                        this.iec.bitpos = 0;
                    }
                    break;

                // ATN pulled down by the computer
                case 16:
                    if (this.iec.statetime >= 60) {
                        this.atnReset();
                    }
                    break;
            }

            if (this.iec.state != prevState) {
                this.iec.statetime = 0;
            }
            this.iec.prevatn = this.owner.IEC.check('ATN');
            this.iec.prevclk = this.owner.IEC.check('CLK');
        },
        atnReset: function() {
            this.owner.IEC.register(this.IEC_ID);
            this.owner.IEC.pulldown(this.IEC_ID, 'DATA');
            this.iec.state = 0;
            this.iec.statetime = 0;
            this.iec.eoi = false;
            this.iec.data = 0;
            this.iec.bitpos = 0;
            this.iec.dataready = false;
            this.iec.datalast = false;
        },
        reset: function() {
            this.atnReset();
            this.iec.prevclk = true;
            this.listening = false;
            this.talking = false;
            this.currCommand = null;
            this.currChannel = null;
            this.currFilename.length = 0;
            //this.directory.length = 0;
        },
        init: function() {
        }
    };
});
