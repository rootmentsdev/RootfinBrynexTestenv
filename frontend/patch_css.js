const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');
css = css.replace('header:not(#printable-invoice header),', 'header:not(#printable-invoice header):not(#printable-daybook header),');
css = css.replace('#printable-invoice {', '#printable-invoice,\n  #printable-daybook {\n');
css = css.replace('#printable-invoice * {', '#printable-invoice *,\n  #printable-daybook * {\n');
fs.writeFileSync('src/index.css', css);
