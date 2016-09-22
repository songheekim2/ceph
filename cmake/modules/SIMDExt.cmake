# detect SIMD extentions
#
# HAVE_ARMV8_CRC
# HAVE_ARMV8_SIMD
# HAVE_ARM_NEON
# HAVE_INTEL_SSE
# HAVE_INTEL_SSE2
# HAVE_INTEL_SSE3
# HAVE_INTEL_SSSE3
# HAVE_INTEL_PCLMUL
# HAVE_INTEL_SSE4_1
# HAVE_INTEL_SSE4_2
#
# INTEL_SSE4_1
# 
# SIMD_COMPILE_FLAGS
#

if(CMAKE_SYSTEM_PROCESSOR MATCHES "aarch64|AARCH64")
  CHECK_C_COMPILER_FLAG(-march=armv8-a+crc HAVE_ARMV8_CRC)
  if(HAVE_ARMV8_CRC)
    set(ARM_CRC_FLAGS "-march=armv8-a+crc")
  endif()
  CHECK_C_COMPILER_FLAG(-march=armv8-a+simd HAVE_ARMV8_SIMD)
  if(HAVE_ARMV8_SIMD)
    set(SIMD_COMPILE_FLAGS "${SIMD_COMPILE_FLAGS} -march=armv8-a+simd")
  endif()
elseif(CMAKE_SYSTEM_PROCESSOR MATCHES "arm|ARM")
  CHECK_C_COMPILER_FLAG(-mfpu=neon HAVE_ARM_NEON)
  if(HAVE_ARM_NEON)
    set(SIMD_COMPILE_FLAGS "${SIMD_COMPILE_FLAGS} -mfpu=neon")
  endif()
elseif(CMAKE_SYSTEM_PROCESSOR MATCHES "i386|i686|amd64|x86_64|AMD64")
  CHECK_C_COMPILER_FLAG(-msse HAVE_INTEL_SSE)
  if(HAVE_INTEL_SSE)
    set(SIMD_COMPILE_FLAGS "${SIMD_COMPILE_FLAGS} -msse")
  endif()
  CHECK_C_COMPILER_FLAG(-msse2 HAVE_INTEL_SSE2)
  if(HAVE_INTEL_SSE2)
    set(SIMD_COMPILE_FLAGS "${SIMD_COMPILE_FLAGS} -msse2")
  endif()
  CHECK_C_COMPILER_FLAG(-msse3 HAVE_INTEL_SSE3)
  if(HAVE_INTEL_SSE3)
    set(SIMD_COMPILE_FLAGS "${SIMD_COMPILE_FLAGS} -msse3")
  endif()
  CHECK_C_COMPILER_FLAG(-mssse3 HAVE_INTEL_SSSE3)
  if(HAVE_INTEL_SSSE3)
    set(SIMD_COMPILE_FLAGS "${SIMD_COMPILE_FLAGS} -mssse3")
  endif()
  CHECK_C_COMPILER_FLAG(-mpclmul HAVE_INTEL_PCLMUL)
  if(HAVE_INTEL_PCLMUL)
    set(SIMD_COMPILE_FLAGS "${SIMD_COMPILE_FLAGS} -mpclmul")
  endif()
  CHECK_C_COMPILER_FLAG(-msse4.1 INTEL_SSE4_1)
  CHECK_C_COMPILER_FLAG(-msse4.1 HAVE_INTEL_SSE4_1)
  if(HAVE_INTEL_SSE4_1)
    set(SIMD_COMPILE_FLAGS "${SIMD_COMPILE_FLAGS} -msse4.1")
  endif()
  CHECK_C_COMPILER_FLAG(-msse4.2 HAVE_INTEL_SSE4_2)
  if(HAVE_INTEL_SSE4_2)
    set(SIMD_COMPILE_FLAGS "${SIMD_COMPILE_FLAGS} -msse4.2")
  endif()
endif()
