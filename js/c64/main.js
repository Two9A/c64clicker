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
    };
    return C64;
});
