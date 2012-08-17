/*

# Expects implemented functions
## shenjs_open(type, name, direction)
## shenjs_puts(str)
## shenjs_gets()
## shenjs_open_repl()

# Stream object structure

  stream_in -> [tag, get_byte(), close()]
  stream_out -> [tag, put_byte(byte), close()]
  stream_inout -> [tag, stream_in, stream_out]
*/

shenjs_globals["shen_*home-directory*"] = ""

function shenjs_file_instream_get(stream, s, pos) {
  if (s.length <= pos) {
    stream[1] = (function() {return -1})
    return -1
  }
  stream[1] = (function() {
    return shenjs_file_instream_get(stream, s, pos + 1)
  })
  return s.charCodeAt(pos)
}

function shenjs_read_byte(stream) {
 switch (stream[0]) {
    case shen_type_stream_in: return stream[1]()
    case shen_type_stream_inout: return shenjs_read_byte(stream[1])
    default:
      shenjs_error("read-byte: Wrong stream type.")
      return -1;
  }
}

function shenjs_write_byte(byte, stream) {
 switch (stream[0]) {
    case shen_type_stream_out:
      stream[1](byte)
      break;
    case shen_type_stream_inout:
      shenjs_write_byte(byte, stream[2])
      break;
    default: shenjs_error("write-byte: Wrong stream type.")
  }
  return []
}

function shenjs_close(stream) {
  switch (stream[0]) {
    case shen_type_stream_in:
      stream[2]()
      stream[1] = (function() {return -1});
      break;
    case shen_type_stream_out:
      stream[2]()
      stream[1] = (function(_) {return []});
      break;
    case shen_type_stream_inout:
      shenjs_close(stream[1])
      shenjs_close(stream[2])
      break;
  }
  return []
}

function shenjs_repl_write_byte(byte) {
  shenjs_puts(String.fromCharCode(byte))
}

function shenjs_repl_read_byte(stream, s, pos) {
  if (s == null) {
    stream[1] = (function() {return -1})
    quit()
    return -1
  } else if (pos >= s.length) {
    stream[1] = (function() {
      return shenjs_repl_read_byte(stream, shenjs_gets(), 0)
    })
    return shenjs_call(shen_newline, [])
  } else {
    stream[1] = (function() {
      return shenjs_repl_read_byte(stream, s, pos + 1)
    })
  }
  return s.charCodeAt(pos)
}

function shenjs_pr(s, stream) {
  for (i = 0; i < s.length; ++i)
    shenjs_write_byte(s.charCodeAt(i), stream)
  return s
}

shenjs_open_repl()
