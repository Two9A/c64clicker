.segment "VECTORS"
    .word $0000
    .word $e000
    .word handler_vblank

.code

GAMEFLAGS = $02
SPR_X_LO  = $10
SPR_X_HI  = $11
SPR_Y     = $12
SCR_RAM   = $13
COL_RAM   = $15
SCR_RAM2  = $15
RASTER_LO = $17
RASTER_HI = $18
BORDERCOL = $19
SCROLLPOS = $1A

TMP0      = $30

reset:
    ;--- Stack setup ------------------------------------------------------
    sei
    ldx #$FF
    txs

    ;--- VIC setup --------------------------------------------------------
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
    lda #44             ; Interrupt at line 300
    sta $d012           ; (within vblank)
    sta RASTER_LO
    lda #1
    sta RASTER_HI       ; And store 304 for the IRQ

    ;--- CIA interrupt disabling ------------------------------------------
    lda #$7f
    sta $dc0d
    sta $dd0d           ; Disable interrupts on both CIAs
    lda $dc0d
    lda $dd0d           ; Acknowledge interrupts on both CIAs

    cli                 ; Turn interrupts back on

    ;--- Screen clearing and initial print --------------------------------
    lda #0
    sta SCR_RAM
    sta COL_RAM
    lda #$04
    sta SCR_RAM + 1     ; SCR_RAM = $0400
    lda #$d8
    sta COL_RAM + 1     ; COL_RAM = $d800

    lda #32             ; Clearing screen to char 32 (" ")
    ldy #0              ; One chunk of 256 bytes at a time
clrlp1:
    sta (SCR_RAM), y
    dey
    bne clrlp1
    inc SCR_RAM + 1
clrlp2:
    sta (SCR_RAM), y
    dey
    bne clrlp2
    inc SCR_RAM + 1
clrlp3:
    sta (SCR_RAM), y
    dey
    bne clrlp3
    inc SCR_RAM + 1
clrlp4:
    sta (SCR_RAM), y
    dey
    bne clrlp4

    lda #14             ; Clearing color RAM to light blue
    ldy #0              ; Again, one page at a time
clrlp5:
    sta (COL_RAM), y
    dey
    bne clrlp5
    inc COL_RAM + 1
clrlp6:
    sta (COL_RAM), y
    dey
    bne clrlp6
    inc COL_RAM + 1
clrlp7:
    sta (COL_RAM), y
    dey
    bne clrlp7
    inc COL_RAM + 1
clrlp8:
    sta (COL_RAM), y
    dey
    bne clrlp8

    lda #40
    sta SCR_RAM
    lda #120
    sta SCR_RAM2
    lda #$04
    sta SCR_RAM + 1     ; SCR_RAM = $0428
    sta SCR_RAM2 + 1    ; SCR_RAM2 = $0478
    ldy #39             ; Copying 40 bytes
scrlp1:
    lda scrdata, y
    sta (SCR_RAM), y    ; From line 1 of initial data
    lda scrdata + 40, y
    sta (SCR_RAM2), y   ; And line 2 of initial data
    dey
    bpl scrlp1

    lda #200
    sta SCR_RAM         ; SCR_RAM = $04c8
    ldy #5              ; Copying 6 bytes
scrlp2:
    lda scrdata_sub, y
    sta (SCR_RAM), y    ; From line 3 of initial data
    dey
    bpl scrlp2

    lda #$e0            ; Character 224 (the cursor)
    sta $04f0           ; In place under the READY.

    ;--- Sprite loading ---------------------------------------------------
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
    sta SPR_X_LO
    sta SPR_Y
    lda #0
    sta SPR_X_HI
    lda #$07            ; Sprite 0 is yellow
    sta $d027

    ;--- We're done, spin forever -----------------------------------------
    jmp *

;--------------------------------------------------------------------------
; Raster interrupt handler!
handler_vblank:
    pha
    txa
    pha
    tya
    pha                 ; Save state
    dec $d019           ; Acknowledge

    ;--- Change the border color ------------------------------------------
vbl_bars:
    lda GAMEFLAGS
    and #1              ; Bit 0 of GAMEFLAGS
    beq vbl_inc         ; is "rasterbars on"
    lda BORDERCOL
    adc #3
    sta BORDERCOL
    sta $d020

    ;--- Increment raster trap point by 12 --------------------------------
vbl_inc:
    lda $d011
    and #$7f
    sta TMP0

    lda RASTER_LO
    clc
    adc #12
    sta RASTER_LO       ; Add 12 to the low byte
    sta $d012           ; And write to VIC
    lda RASTER_HI
    adc #0
    and #1
    sta RASTER_HI
    clc
    ror
    ror
    ora TMP0
    sta $d011

    lda RASTER_HI
    beq vbl_notop       ; If the high bit is 1,
    lda RASTER_LO
    cmp #56             ; and the low byte is
    bcc vbl_notop       ; >= 56, then
    lda #0              
    sta RASTER_LO
    sta RASTER_HI       ; Go back to the top
    sta $d012           ; And (wastefully!) go back
    lda $d011           ; through the VIC's 9 bits
    and #$7f            ; of RASTER to reset them
    sta $d011
    jmp vbl_frame       ; Then do the per-frame work

vbl_notop:
    jmp vbl_end         ; Otherwise skip all this!

    ;--- Per-frame events: scrollshake ------------------------------------
vbl_frame:
    lda GAMEFLAGS
    and #2              ; Bit 1 of GAMEFLAGS
    beq vbl_kb          ; is "scrollshake on"
    lda SCROLLPOS
    clc
    adc #$1b            ; Add 3 to Y, and 5 to X
    sta SCROLLPOS       ; to simulate "random"
    tax

    lda $d016
    and #$f8            ; Mask off and save the
    sta TMP0            ; top 5 bits of D016
    txa
    and #7              ; Mask in the X component
    ora TMP0            ; And tack them together
    sta $d016

    lda $d011
    and #$f8            ; Do the same for D011
    sta TMP0
    txa
    lsr                 ; This time, push the
    lsr                 ; Y component into place
    lsr                 ; before we do the masking
    and #7              ; of the bottom 3 bits
    ora TMP0            ; Tack them together too
    sta $d011

    ;--- Per-frame events: Move sprite by joystick direction --------------
vbl_kb:
    ldx $dc00           ; Get Joy2's status

vbl_kb_up:
    txa
    and #1
    bne vbl_kb_down
    dec SPR_Y

vbl_kb_down:
    txa
    and #2
    bne vbl_kb_right
    inc SPR_Y

vbl_kb_right:
    txa
    and #4
    bne vbl_kb_left
    lda SPR_X_LO
    clc
    adc #1
    sta SPR_X_LO
    lda SPR_X_HI
    adc #0
    and #1
    sta SPR_X_HI

vbl_kb_left:
    txa
    and #8
    bne vbl_kb_end
    lda SPR_X_LO
    clc
    sbc #1
    sta SPR_X_LO
    lda SPR_X_HI
    sbc #0
    and #1
    sta SPR_X_HI

vbl_kb_end:
    lda SPR_X_LO
    sta $d000
    lda SPR_X_HI
    sta $d010
    ldx SPR_Y
    stx $d001

vbl_end:
    pla
    tay
    pla
    tax
    pla
    rti

;--------------------------------------------------------------------------
sprdata:
    .byt 0, 126, 0, 3, 255, 192, 7, 255, 224
    .byt 31, 255, 248, 31, 255, 248, 63, 255, 252
    .byt 127, 255, 254, 127, 254, 254, 255, 253, 255
    .byt 255, 251, 255, 255, 247, 255, 255, 239, 255
    .byt 255, 223, 255, 127, 191, 254, 127, 127, 254
    .byt 63, 255, 252, 31, 255, 248, 31, 255, 248
    .byt 7, 255, 224, 3, 255, 192, 0, 126, 0

scrdata:
    .byt 32,32,32,32,42,42,42,42,32,3,15,13,13,15,4,15,18,5,32
    .byt 54,52,32,2,1,19,9,3,32,22,50,32,42,42,42,42,32,32,32,32,32
    .byt 32,54,52,11,32,18,1,13,32,19,25,19,20,5,13,32,32
    .byt 51,56,57,49,49,32,2,1,19,9,3,32,2,25,20,5,19,32,6,18,5,5,32

scrdata_sub:
    .byt 18,5,1,4,25,46
