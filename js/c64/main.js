define([
    'c64/vic',
    'c64/mmu',
    'c64/cpu',
    'c64/cia',
], function(VIC, MMU, CPU, CIA) {
    var C64 = {
        MMU: MMU,
        CPU: CPU,
        CIA: CIA,
        VIC: VIC
    };
    for (var i in C64) {
        if (C64.hasOwnProperty(i)) {
            C64[i].owner = C64;
            C64[i].init.call(C64[i]);
        }
    }
    C64.reset = function() {
        C64.MMU.reset();
        C64.CPU.reset();
        C64.CIA.reset();
        C64.VIC.reset();
        C64.saveFrame(0, 1);
    };

    C64.savedFrames = {};
    C64.saveFrame = function(frame, numFrames) {
        if (C64.savedFrames[frame]) {
            return;
        }
        if (numFrames > 2) {
            numFrames = 2;
        }
        C64.savedFrames[frame] = {
            MMU: C64.MMU.getState(),
            CPU: C64.CPU.getState(),
            CIA: C64.CIA.getState(),
            VIC: C64.VIC.getState()
        };
        for (i in C64.savedFrames) {
            if (i > 0 && i < (frame - numFrames)) {
                delete C64.savedFrames[i];
            }
        }
    };
    C64.restoreFrame = function(frame) {
        if (!C64.savedFrames[frame]) {
            frame = 0;
        }
        for (i in C64.savedFrames[frame]) {
            C64[i].setState(C64.savedFrames[frame][i]);
        }
    };
    return C64;
});
