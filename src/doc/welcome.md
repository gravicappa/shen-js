# Welcome to Shen-js browser REPL

*If you don't want to see this document again use this [link](#) in the
future.*

## New Shen-js features

* Cleaner objects representation.
* [Green threads](#.doc/threads.html).
* [Better FFI](#.doc/ffi.html).
* [Async-compatible VM](#.doc/internals.html).
* New shiny web UI which has
  - built-in editor,
  - built-in documentation viewer,
  - persistent file storage in web UI (via IndexedDB),
  - ability to load files from github.com (see [Github loader](#.doc/web.html)),
  - initialisation file `.init.shen` loading on startup.

## Usage

The screen is divided into three parts:

* filesystem pane which now should be hidden,
* editor pane on the left,
* repl pane on the right.

### Filesystem pane

Press a button <span id="fs_btn_sample"></span> on topleft page corner to show
or hide filesystem view which represents virtual filesystem.

Click on a file or directory to select it. If a file has `.html` extension
then it will be displayed in the editor pane as a formatted document (just
like this manual). Otherwise it will be opened for modifications.

Actions of buttons on the top of the pane are performed to selected item. If
you want to create a file then select destination directory and click on
"create file" button.

You also can upload or download files. Use corresponding buttons at the top of
filesystem pane or in the title of currently opened document (if applicable).

### Editor pane

Here you can view formatted documents or edit sources. When editable file is
loaded additional buttons appear at the title which allow running file in
Shen, downloading, updating, etc.

### REPL pane

Nothing unexpected here.

## Learn Shen

If you're new to Shen you can take a [15 min tutorial](#.learn/15min.html).
<span style="display:none">Also browse `.learn` folder in Filesystem pane.</span>

## Development

The application is still buggy and incomplete. It lacks a lot of features,
such as:

* extensive documentation,
* built-in Shen tutorials,
* loading files from services like github.com,
* cleaner visual style (icons, colours and other such things),
* …

Any form of [contribution](#.doc/development.html) is welcome.

<script type="application/javascript">
(function() {
  var to = document.getElementById("fs_btn_sample"),
      x = document.getElementById("fs_toggle_label").cloneNode(true);
  to.style.border = "1px solid #ddd";
  to.style.display = "inline-block";
  //x.htmlFor = null;
  x.style.display = "block";
  to.appendChild(x);
})();
</script>