Commodore Clicker
=================

A JavaScript incremental game which drives the clock of a Commodore 64 emulation. Or at least, that's the eventual goal.

Usage
-----

The emulated C64 boots into the incremental game, but this can be interrupted in the usual manner of hitting Run/Stop + Restore. After interruption, the game can be restarted using the statement: SYS 49152

A joystick is plugged into port 2 of the C64, and its directions are mapped to the arrow keys. The joystick is used in-game to allow movement of the sprite. Alt is the Fire key, but this is not used in-game at this time.

The keyboard corresponds to that of a British C64, and is mapped in similar fashion to VICE's mapping. The following keys are non-obvious mappings:

* F1, F2, F3, F4 are mapped to the C64's F1, F3, F5, F7. Shift-F1 is the C64's F2, and so on.
* Escape is Run/Stop; F8 is Restore.
* Tab is the C64's Control; the host's Control maps to the Commodore key.

Key map entries not mentioned here are documented in the CIA emulation.

Credits
-------

Libraries included:

* BigInteger, by Matthew Crumley and John Tobey: http://silentmatt.com/biginteger/
* jQuery.PowerTip, by Steven Benner: http://stevenbenner.github.com/jquery-powertip/
* Require.js, by the Dojo Foundation: http://github.com/jrburke/requirejs
* jQuery-Ajax-Blob-ArrayBuffer, by Christopher Keefer: https://gist.github.com/SaneMethod/7548768
* JSZip, by Stuart Knightley: https://github.com/Stuk/jszip
* And, of course, jQuery.

Test ROMs included:

* Klaus Dormann's 6502 functional tests: https://github.com/redline6561/cl-6502/blob/b0087903/tests/6502_functional_test.a65
