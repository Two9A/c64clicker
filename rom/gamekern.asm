    .code

reset:
    ; Stack setup
    sei
    ldx #$FF
    txs

    ; VIC setup
    lda #$9b            ; Standard text mode
    sta $d011
    lda #$08            ; 40-column borders
    sta $d016
    lda #$14            ; Char ROM/screen RAM in
    sta $d018           ; the normal places
    lda #$0f            ; Enable all interrupts
    sta $d01a
    lda #$0e            ; Light blue border
    sta $d020
    lda #$06            ; Dark blue background
    sta $d021
    lda #3              ; Interrupt at line 259
    sta $d012           ; (start of bottom border)

    cli                 ; Turn interrupts back on

    ; Sprite loading
    ldx #62
sprlp:
    lda sprdata, x
    sta $3fc0, x
    dex
    bne sprlp

    lda #$ff            ; Set pointer for sprite 0
    sta $07f8
    lda #$80            ; Set sprite 0 X and Y
    sta $d000
    sta $d001
    lda #$07            ; Sprite 0 is yellow
    sta $d027

    cli

    ; We're done, spin forever
    jmp *

; Raster interrupt handler!
raster:
    rti

sprdata:
    .byt 0, 126, 0, 3, 255, 192, 7, 255, 224
    .byt 31, 255, 248, 31, 255, 248, 63, 255, 252
    .byt 127, 255, 254, 127, 254, 254, 255, 253, 255
    .byt 255, 251, 255, 255, 247, 255, 255, 239, 255
    .byt 255, 223, 255, 127, 191, 254, 127, 127, 254
    .byt 63, 255, 252, 31, 255, 248, 31, 255, 248
    .byt 7, 255, 224, 3, 255, 192, 0, 126, 0

    ; RESET pointer
    .segment "VECTORS"
    .word $0000
    .word $e000
    .word raster
