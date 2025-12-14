# x86_64 Support Status

## Overview

This document describes the current status of x86_64 (AMD64/Intel 64) support in v86. As of now, v86 has **partial x86_64 support** that allows the emulator to respond correctly to x86_64 CPUID queries and MSR accesses, but **does not yet implement long mode** (64-bit execution mode).

## Current Implementation

### Completed ✅

1. **MSR (Model-Specific Register) Support**
   - Implemented read/write support for x86_64-specific MSRs:
     - `IA32_EFER` (0xC0000080) - Extended Feature Enable Register
     - `IA32_STAR` (0xC0000081) - SYSCALL Target Address
     - `IA32_LSTAR` (0xC0000082) - Long Mode SYSCALL Target Address
     - `IA32_CSTAR` (0xC0000083) - Compatibility Mode SYSCALL Target Address
     - `IA32_SFMASK` (0xC0000084) - SYSCALL Flag Mask
     - `IA32_FS_BASE` (0xC0000100) - FS Segment Base
     - `IA32_GS_BASE` (0xC0000101) - GS Segment Base
     - `IA32_KERNEL_GS_BASE` (0xC0000102) - Kernel GS Base (for SWAPGS)
     - `IA32_TSC_AUX` (0xC0000103) - TSC Auxiliary
   
2. **CPUID Extensions**
   - Extended CPUID leaf 0x80000000 to report maximum extended leaf as 0x80000008
   - Implemented CPUID leaf 0x80000001 to advertise x86_64 features:
     - Long Mode (bit 29 of EDX)
     - SYSCALL/SYSRET (bit 11 of EDX)
     - LAHF/SAHF in 64-bit mode (bit 0 of ECX)
   - Implemented CPUID leaf 0x80000008 to report address sizes:
     - 48-bit virtual address space
     - 36-bit physical address space

3. **EFER Register Management**
   - Proper handling of EFER bits:
     - SCE (System Call Extensions)
     - LME (Long Mode Enable)
     - LMA (Long Mode Active) - read-only
     - NXE (No-Execute Enable) - masked (not implemented)
   - Detection of long mode entry attempts (EFER.LME + CR4.PAE + CR0.PG)

4. **Configuration**
   - Added `ENABLE_X86_64_EXPERIMENT` flag in `src/rust/config.rs`
   - Currently set to `true` to enable x86_64 feature advertisement

### Not Implemented ❌

The following critical components are **not yet implemented** and prevent booting x86_64 operating systems:

1. **Long Mode CPU State**
   - No tracking of current operating mode (protected mode vs. long mode)
   - No 64-bit code segment handling
   - No compatibility mode support

2. **64-bit Registers**
   - No support for 64-bit general-purpose registers (RAX, RBX, RCX, etc.)
   - No support for extended registers (R8-R15)
   - No support for 64-bit operand sizes

3. **REX Prefix**
   - REX prefixes (0x40-0x4F) are not decoded or handled
   - Cannot access 64-bit registers or use 64-bit operand sizes
   - Cannot access extended registers (R8-R15)

4. **64-bit Addressing**
   - No support for 64-bit address calculations
   - Address size limited to 32-bit
   - RIP-relative addressing not implemented

5. **4-Level Page Tables (Long Mode Paging)**
   - Current implementation supports only:
     - 32-bit paging (2-level: PD → PT)
     - PAE paging (3-level: PDPT → PD → PT)
   - Long mode requires 4-level paging (PML4 → PDPT → PD → PT)
   - Canonical address checking not implemented

6. **64-bit Instructions**
   - No support for 64-bit-specific instructions
   - No support for 64-bit variants of existing instructions
   - No support for new instructions introduced with x86_64

7. **System Call Instructions**
   - SYSCALL/SYSRET instructions not implemented
   - SWAPGS instruction not implemented

8. **State Saving/Restoration**
   - x86_64 MSRs not included in save state
   - Long mode state not preserved across save/restore

## Current Behavior

When `ENABLE_X86_64_EXPERIMENT` is enabled:

1. Guest OS can query x86_64 capabilities via CPUID
2. Guest OS can read/write x86_64 MSRs (values are stored but mostly ignored)
3. **When guest attempts to enter long mode** (by setting EFER.LME, CR4.PAE, and CR0.PG):
   - The emulator **panics** with message: "x86_64 long mode not implemented"
   - This prevents undefined behavior from executing in an unsupported mode

## Testing

To test the current x86_64 support:

```javascript
var emulator = new V86({
    screen_container: document.getElementById("screen_container"),
    bios: { url: "../../bios/seabios.bin" },
    vga_bios: { url: "../../bios/vgabios.bin" },
    cdrom: { url: "../../images/linux64.iso" },  // x86_64 Linux image
    autostart: true,
});
```

**Expected behavior**: The guest will boot, detect x86_64 CPU, and when it tries to enter long mode, the emulator will log an error and panic.

## Roadmap for Full x86_64 Support

To fully support booting x86_64 operating systems, the following work is required (in approximate order):

### Phase 1: Basic Long Mode Support
1. Implement 64-bit register state (RAX-R15)
2. Implement REX prefix decoding
3. Implement long mode state tracking (is_64_bit_mode flag)
4. Implement 4-level page table walking
5. Implement canonical address checking
6. Remove panic in set_cr0, set EFER.LMA when entering long mode

### Phase 2: 64-bit Instruction Support
1. Implement 64-bit operand size for existing instructions
2. Implement RIP-relative addressing
3. Implement SYSCALL/SYSRET instructions
4. Implement SWAPGS instruction
5. Update instruction decoder for REX prefix handling

### Phase 3: JIT Support
1. Update JIT code generator for 64-bit operations
2. Implement 64-bit register allocation in JIT
3. Update TLB for 4-level page tables
4. Optimize 64-bit address translation

### Phase 4: Complete Implementation
1. Implement compatibility mode (32-bit code in 64-bit OS)
2. Add x86_64 MSRs to save/restore state
3. Implement RDFSBASE/WRFSBASE instructions
4. Full validation and testing with various x86_64 OSes

## Estimated Complexity

Implementing full x86_64 support is a **major undertaking** requiring:
- Significant changes to core CPU emulation (1000+ lines of code)
- Updates to instruction decoder and executor (500+ lines)
- Paging subsystem rewrite (300+ lines)
- JIT compiler updates (1000+ lines)
- Extensive testing and debugging

**Estimated effort**: 2-4 weeks of full-time development

## References

- [Intel® 64 and IA-32 Architectures Software Developer's Manual](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
- [AMD64 Architecture Programmer's Manual](https://www.amd.com/en/search/documentation/hub.html)
- [OSDev Wiki - Long Mode](https://wiki.osdev.org/Long_Mode)
- [OSDev Wiki - Setting Up Long Mode](https://wiki.osdev.org/Setting_Up_Long_Mode)

## Contributing

If you're interested in implementing x86_64 support, please:
1. Start with Phase 1, item 1 (64-bit register state)
2. Create tests for each feature before implementing
3. Ensure existing 32-bit functionality is not broken
4. Document any assumptions or limitations

---

Last updated: December 14, 2025
