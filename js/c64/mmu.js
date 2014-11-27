define(function() {
    return {
        busLock: null,
        vicBank: null,
        PORT0: null,
        PORT1: null,

        ram: null,
        romBasic: null,
        romKernal: null,

        init: function() {
            this.busLock = 0;
            this.vicBank = 0;
            this.PORT0 = 0;
            this.PORT1 = 0;

            this.ram = new Uint8Array(65536);
            this.romBasic = new Uint8Array(8192);
            this.romKernal = new Uint8Array(8192);
        }
    };
});
