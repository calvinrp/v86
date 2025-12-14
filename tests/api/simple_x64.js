import { V86 } from "../../src/main.js";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wasm_path = path.resolve(__dirname, "../../build/wasm32-unknown-unknown/release/v86.wasm");

console.log("Loading WASM from:", wasm_path);

const emulator = new V86({
    wasm_path: wasm_path,
    memory_size: 32 * 1024 * 1024,
    bios: { buffer: new ArrayBuffer(0) }, // dummy bios to satisfy init
    vga_bios: { buffer: new ArrayBuffer(0) },
    autostart: false,
    disable_jit: true
});

emulator.add_listener("emulator-ready", () => {
    console.log("Emulator ready");
    const cpu = emulator.v86.cpu;

    // Code: cpuid; hlt
    const code = new Uint8Array([
        0x0F, 0xA2,                   // cpuid
        0xF4                          // hlt
    ]);
    
    emulator.write_memory(code, 0x7C00);
    cpu.instruction_pointer[0] = 0x7C00;
    
    // Set CS to 0
    cpu.sreg[1] = 0; 
    cpu.segment_offsets[1] = 0;
    cpu.segment_limits[1] = 0xFFFF;
    cpu.segment_is_null[1] = 0;

    // Set EAX to 0x80000001
    cpu.reg32[0] = 0x80000001;
    
    console.log("Running...");
    emulator.run();
    
    setTimeout(() => {
        emulator.stop();
        // Check EDX register (index 2)
        const edx = cpu.reg32[2];
        const expected = (1 << 11) | (1 << 20) | (1 << 27) | (1 << 29);
        
        console.log("EDX: 0x" + (edx >>> 0).toString(16));
        console.log("EIP: 0x" + cpu.instruction_pointer[0].toString(16));
        console.log("Instructions: " + cpu.instruction_counter[0]);
        
        if ((edx & expected) === expected) {
            console.log("Test Passed: Long Mode, SYSCALL, NX, RDTSCP bits set in CPUID");
            process.exit(0);
        } else {
            console.error("Test Failed: EDX=" + (edx >>> 0).toString(16) + ", expected mask=" + expected.toString(16));
            process.exit(1);
        }
    }, 1000);
});
