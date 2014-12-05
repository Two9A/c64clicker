define(function() {
    return {
        JOY_UP: 1,
        JOY_DOWN: 2,
        JOY_LEFT: 4,
        JOY_RIGHT: 8,
        JOY_FIRE: 16,

        currJoyPort: null,

        registers: [
            // CIA1: peripherals/IRQ
            [
                0, // Port A
                0, // Port B
                0, // Port A direction
                0, // Port B direction
                0, // Timer A low byte
                0, // Timer A high byte
                0, // Timer B low byte
                0, // Timer B high byte
                0, // RTC tenth-of-sec
                0, // RTC sec
                0, // RTC min
                0, // RTC hour
                0, // Shift register
                0, // IRQ source
                0, // Timer A control
                0  // Timer B control
            ],

            // CIA2: RS232/NMI
            [
                0, // Port A
                0, // Port B
                0, // Port A direction
                0, // Port B direction
                0, // Timer A low byte
                0, // Timer A high byte
                0, // Timer B low byte
                0, // Timer B high byte
                0, // RTC tenth-of-sec
                0, // RTC sec
                0, // RTC min
                0, // RTC hour
                0, // Shift register
                0, // NMI source
                0, // Timer A control
                0  // Timer B control
            ]
        ],

        io_r: function(addr) {
            var chip = (addr & 0x0100) ? 1 : 0;
            addr &= 0x0F;
            return this.registers[chip][addr];
        },
        io_w: function(addr, val) {
            var chip = (addr & 0x0100) ? 1 : 0;
            addr &= 0x0F;
            this.registers[chip][addr] = val & 255;
        },
        handlers: {
            keydown: function(e) {
                switch (e.keyCode) {
                    case 37:
                        this.registers[0][this.currJoyPort] &= (255 - this.JOY_LEFT);
                        break;
                    case 38:
                        this.registers[0][this.currJoyPort] &= (255 - this.JOY_UP);
                        break;
                    case 39:
                        this.registers[0][this.currJoyPort] &= (255 - this.JOY_RIGHT);
                        break;
                    case 40:
                        this.registers[0][this.currJoyPort] &= (255 - this.JOY_DOWN);
                        break;
                    case 32:
                        this.registers[0][this.currJoyPort] &= (255 - this.JOY_FIRE);
                        break;
                }
            },
            keyup: function(e) {
                switch (e.keyCode) {
                    case 37:
                        this.registers[0][this.currJoyPort] |= this.JOY_LEFT;
                        break;
                    case 38:
                        this.registers[0][this.currJoyPort] |= this.JOY_UP;
                        break;
                    case 39:
                        this.registers[0][this.currJoyPort] |= this.JOY_RIGHT;
                        break;
                    case 40:
                        this.registers[0][this.currJoyPort] |= this.JOY_DOWN;
                        break;
                    case 32:
                        this.registers[0][this.currJoyPort] |= this.JOY_FIRE;
                        break;
                }
            }
        },
        reset: function() {
            // All pins are pulled high on the data ports
            this.registers[0][0] = 255;
            this.registers[0][1] = 255;
            this.registers[1][0] = 255;
            this.registers[1][1] = 255;

            this.currJoyPort = 0;
        },
        init: function() {
            this.reset();
            $(document)
                .on('keydown', this.handlers.keydown.bind(this))
                .on('keyup', this.handlers.keyup.bind(this));
        }
    };
});
