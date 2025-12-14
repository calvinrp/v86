pub const LOG_PAGE_FAULTS: bool = false;

pub const VMWARE_HYPERVISOR_PORT: bool = true;

/// Experimental: Advertise/enable x86_64-related CPUID/MSR bits.
///
/// Note: This does *not* implement long mode yet. Enabling this will make guests attempt to use
/// long mode/syscall/NX and likely crash until the CPU/MMU work is completed.
pub const ENABLE_X86_64_EXPERIMENT: bool = true;
