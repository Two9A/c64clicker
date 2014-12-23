.segment "VECTORS"
    .word $0000
    .word $e000
    .word handler_raster

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
RASTERBAR = $19
SCROLLPOS = $1A
BGCOL     = $1B

TMP0      = $30
TMP1      = $31

reset:
    ;--- Stack setup ------------------------------------------------------
    sei
    ldx #$FF
    txs

    ;--- VIC setup --------------------------------------------------------
    lda #$9b            ; Standard text mode
    sta $d011
    and #$7f
    sta TMP1
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
    lda #0
    sta RASTERBAR       ; Start off with no rasterbars

    ;--- CIA interrupt setup ----------------------------------------------
    lda #$7e
    sta $dc0d           ; Enable timer A interrupt on CIA1
    lda #$7f
    sta $dd0d           ; Disable interrupts on CIA2
    lda $dc0d
    lda $dd0d           ; Acknowledge interrupts on both CIAs

    lda #$ff
    sta $dc04
    lda #$ff
    sta $dc05           ; Latch timer A at 65535 (3.334 frames)
    lda #$01
    sta $dc0e           ; Start timer A (latchroll, multishot)

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
handler_raster:
    pha
    dec $d019           ; Acknowledge

    ;--- Check if this was the CIA interrupting ---------------------------
    lda $dc0d
    bne handler_cia

    ;--- Change the border color ------------------------------------------
raster_bars:
    lda $d020
    adc RASTERBAR
    sta $d020

    ;--- Increment raster trap point by 12 --------------------------------
raster_inc:
    lda $d012
    adc #12             ; (Carry is cleared above)
    sta RASTER_LO
    sta $d012           ; And write to VIC
    lda RASTER_HI       ; 16-bit addition
    adc #0
    sta RASTER_HI
    ror                 ; Again, carry is clear, so
    ror                 ; this rotates bit 0 to bit 7
    ora TMP1            ; Set the original VIC flags
    sta $d011

    rol
    bcc raster_notop    ; If the high bit is 1,
    lda RASTER_LO
    cmp #50             ; and the low byte is
    bcc raster_notop    ; >= 44 or so, then
    lda #1              
    sta $d012
    sta RASTER_LO
    lda #0
    sta RASTER_HI       ; Go back to the top (line 1)
    lda TMP1
    sta $d011
    bne vbl_frame       ; Skip over to do the per-frame work

raster_notop:
    pla
    rti                 ; Leaving the handler early!

    ;--- CIA handler (within relative-jump range of the top of handler) ---
handler_cia:
    lda GAMEFLAGS
    and #16             ; Bit 4 of GAMEFLAGS
    beq cia_end         ; is "background change on"
    lda BGCOL
    adc #3
    sta BGCOL
    sta $d021           ; Change the background color
cia_end:
    pla
    rti                 ; Leaving the handler

    ;--- Per-frame events: scrollshake ------------------------------------
vbl_frame:
    txa
    pha

    lda GAMEFLAGS
    and #1              ; Bit 0 of GAMEFLAGS
    beq vbl_shake       ; is "rasterbars on"
    lda #3              ; If it's on, we'll add 3 to
    sta RASTERBAR       ; the color every 12 lines

vbl_shake:
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
    and #$7f
    sta TMP1

    ;--- Per-frame events: Move sprite by joystick direction --------------
vbl_kb:
    ldx $dc00           ; Get Joy2's status

vbl_kb_up:
    txa
    and #1              ; Check bit 0 (UP)
    bne vbl_kb_down
    dec SPR_Y           ; If it's set, move up

vbl_kb_down:
    txa
    and #2              ; Check bit 1 (DOWN)
    bne vbl_kb_right
    inc SPR_Y           ; If it's set, move down

vbl_kb_right:
    txa
    and #8              ; Check bit 3 (RIGHT)
    bne vbl_kb_left
    lda SPR_X_LO        ; If it's set, perform a
    clc                 ; 16-bit addition of 1
    adc #1              ; and mask it down to 0-511
    sta SPR_X_LO
    lda SPR_X_HI
    adc #0
    and #1
    sta SPR_X_HI

vbl_kb_left:
    txa
    and #4              ; Check bit 2 (LEFT)
    bne vbl_kb_end
    lda SPR_X_LO        ; If it's set, perform a
    clc                 ; 16-bit subtraction of 1
    sbc #1              ; and mask it down to 0-511
    sta SPR_X_LO
    lda SPR_X_HI
    sbc #0
    and #1
    sta SPR_X_HI

vbl_kb_end:
    lda SPR_X_LO        ; Positions have been determined,
    sta $d000           ; set them
    lda SPR_X_HI        ; We don't worry about the X-pos
    sta $d010           ; of any other sprites
    ldx SPR_Y
    stx $d001

    ;--- Per-frame events: Check if sprite is enabled ---------------------
vbl_spr:
    lda GAMEFLAGS
    tax
    and #4              ; Bit 2 of GAMEFLAGS
    beq vbl_sprdbl      ; is "sprite on"
    lda #1
    sta $d015
vbl_sprdbl:
    txa
    and #8              ; Bit 3 of GAMEFLAGS
    beq raster_end      ; is "sprite doubled"
    lda #1
    sta $d017
    sta $d01d

    ;--- End of handler: we skipped to here for mid-frame rasters ---------
raster_end:
    pla
    tax
raster_endx:
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
