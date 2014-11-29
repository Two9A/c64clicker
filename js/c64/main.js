define([
    'c64/vic',
    'c64/mmu',
    'c64/cpu'
], function(VIC, MMU, CPU) {
    var C64 = {
        MMU: MMU,
        CPU: CPU,
        VIC: VIC
    };
    for (var i in C64) {
        if (C64.hasOwnProperty(i)) {
            C64[i].owner = C64;
            C64[i].init.call(C64[i]);
        }
    }
    return C64;
});
