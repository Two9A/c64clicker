define([
    'c64/vic',
    'c64/mmu'
], function(VIC, MMU) {
    var C64 = {
        MMU: MMU,
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
