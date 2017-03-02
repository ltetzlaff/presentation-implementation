"use strict";
const exec = require('child_process').exec;

// This uses very easy handcrafted Regular Expressions to parse Markdown to own TeX-template.
// Feel free to use & modify for any reason (LT, 2016).

var tex = {
  start: `
\\documentclass[journal]{IEEEtran}
\\usepackage{url}
\\usepackage{listings}
\\usepackage{subfig}
\\hyphenation{op-tical net-works semi-conduc-tor}
\\usepackage{courier}
\\usepackage{xcolor}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{array}
\\usepackage{pdfpages}


\\setlength{\\parskip}{\\baselineskip}%
\\setlength{\\parindent}{0pt}%
\\definecolor{dkgreen}{rgb}{0,0.6,0}
\\definecolor{gray}{rgb}{0.5,0.5,0.5}


%\\setmonofont{Consolas} %to be used with XeLaTeX or LuaLaTeX
\\definecolor{keyw}{HTML}{BB94B2}
\\definecolor{cmmt}{HTML}{969896}
\\definecolor{str}{HTML}{68BDB5}
\\definecolor{types}{HTML}{74C6F0}
\\definecolor{linenr}{HTML}{999999}
%\\definecolor{bg}{HTML}{1D1F21}
\\definecolor{bg}{HTML}{FFFFFF}
%\\definecolor{basic}{HTML}{C6C8C5}
\\definecolor{basic}{HTML}{1D1F21}

\\setlength\\extrarowheight{5pt}
\\renewcommand{\\arraystretch}{1.3}


\\lstset{language=[Sharp]C,
captionpos=b,
numbers=left, %Nummerierung
numberstyle=\\ttfamily\\tiny\\color{linenr}, % kleine Zeilennummer
numbersep=5pt,
keepspaces=true,
tabsize=2,
frame=lines, % Oberhalb und unterhalb des Listings ist eine Linie
showspaces=false,
showtabs=false,
breaklines=true,
showstringspaces=false,
breakatwhitespace=true,
escapeinside={(*@}{@*)},
commentstyle=\\color{cmmt},
morekeywords={partial, var, value, get, set, foreach, in, =, +, -, *, /},
keywordstyle=\\color{keyw},
stringstyle=\\color{str},
backgroundcolor=\\color{bg},
basicstyle=\\ttfamily\\small\\color{basic},
}

\\lstdefinestyle{inline}{language=[Sharp]C,
  breaklines=true,
  escapeinside={(*@}{@*)},
  commentstyle=\\color{cmmt},
  morekeywords={partial, var, value, get, set, foreach, in, =, +, -, *, /},
  keywordstyle=\\color{keyw},
  basicstyle=\\ttfamily\\small\\color{basic}
}

\\begin{document}
`, end: `
\\end{document}`,
  title: {
    o: "\\title{",
    c: "}"
  },
  image: (path) => {
    let name = path.split("/").pop().split(".")[0];
    return "\\begin{figure*}[!t]\n\\centering\\label{" + name + "}\n\\includegraphics[width=6.5in]{" + path + "}\n\\end{figure*}" 
  },
  italic: {
    c: "}}\\\\",
    o: "\\textit{\\textcolor{blue}{"
  },
  inlineCode: {
    c: "$}",
    o: " {\\lstinline[style=inline]$"
  },
  multicol: {
    //o: "", c: ""
    o: "\\begin{multicols}{2}",
    c: "\\end{multicols}"
  },
  aside: {
    o: "\\begin{aside}",
    c: "\\end{aside}"
  },
  /*quote: {
    o: "\\begin{zitat}",
    c: "\\end{zitat}"
  },*/
  code: {
    /*o: "\\begin{lstlisting}[linewidth=\\textwidth, language=",*/
    o: "\\begin{lstlisting}\n",
    c: "\\end{lstlisting}\n"
  },
  h4: {
    c: "}",
    o: "\\subsubsection{"
  },
  h3: {
    c: "}",
    o: "\\subsection{"
  },
  h2: {
    c: "}",
    o: "\\section{"
  },
  inlineBold: {
    c: "}",
    o: "\\textbf{"
  },
  /*table: {
    c: "\\hline \n\\end{tabular} \n\\end{table}\n\n",
    o3: "\\begin{table}[H]\n\\centering\\begin{tabular}{|l|l|p{7cm}|}\n\\hline",
    o2: "\\begin{table}[H]\n\\centering\\begin{tabular}{|l|p{7cm}|}\n\\hline"
  },*/
  tableRow: {
    c: " \\\\",
    o: "\\hline \n",
    separator: " & "
  },
  table: {
    o: (name) => "\\begin{table}[!t]\\caption{" + name + "}\\label{" + name + "}\n\\centering\\begin{tabular}{|l|c|c|c|l|}\n\\hline",
    c: "\\hline \n\\end{tabular} \n\\end{table}\n\n",
  },
  horizontalLine: "\n\\rule{\\textwidth}{1pt}\n",
  newLine: "\n",
  authors: {
    o: "\\author{",
    c: "}"
  },
  abstract: {
    o: "\\begin{abstract}",
    c: "\\end{abstract}"
  },
  webcode124: "" // is actually pipe but lets not overpower our tex compiler
};

var fs = require("fs");

function parser(source, dest) {
  fs.readFile(source, (err, data) => {
    data = data.toString();

    var s = tex.start + data

    // comments
    .replace(/\[comment\]: # \([\S\s]*?\)/gi, match => {
      return match.slice(14,-1);
    })

    // abstract
    .replace(/[\r\n]## Abstract.*?##/gi, match => {
      return tex.abstract.o + match.slice(12) + tex.abstract.c;
    })

    .replace(/[\r\n]## Appendices.*?##/gi, match => {
      return "\\appendices" + match.slice(14);
    })

    // headings
    .replace(/[\r\n]#### .*?[\r\n]/gi, match => {
      let name = match.slice(6, -1);
      return tex.h4.o + name + tex.h4.c + tex.newLine + "\\label{" + name.toLowerCase() + "}";
    })
    .replace(/[\r\n]### .*?[\r\n]/gi, match => {
      let name = match.slice(5, -1);
      return tex.h3.o + name + tex.h3.c + tex.newLine + "\\label{" + name.toLowerCase() + "}";
    })
    .replace(/[\r\n]## .*?[\r\n]/gi, match => {
      let name = match.slice(4, -1);
      return tex.h2.o + name + tex.h2.c + tex.newLine + "\\label{" + name.toLowerCase() + "}";
    })
    .replace(/# .*?[\r\n]/gi, match => {
      return tex.title.o + match.slice(2, -1) + tex.title.c + tex.newLine;
    })

    // bold
    .replace(/\*\*[a-zA-Z]{1,50}\*\*/gi, match => {
      return tex.inlineBold.o + match.slice(2, -2) + tex.inlineBold.c;
    })

    // refs
    .replace(/\[.{1,16}?\]\[\#.{1,16}?\]/gi, match => {
      let str = match.slice(1, -1).split("][#");
      //return "\\ref{" + str[0] + "}{" + str[1] + "}";
      return " \\ref{" + str[1] + "}";
    })

    // images
    .replace(/\!\[.*?\]\(.*?\)/gi, match => {
      let path = match.slice(2, -1).split("](")[1];
      return tex.image(path);
    })


    // href
    .replace(/\[.*?\]\(.*?\)/gi, match => {
      match = match.replace("#", "\\#");
      let str = match.slice(1, -1).split("](");
      return "\\href{" + str[1] + "}{" + str[0] + "}";
    })

    /*// table start
    .replace(/(\|[\s\S]*?){5}\|/gi, match => {
      return "\n\n" + table.o("Scripts") + match.split(2);
    })

    // tables end
    .replace(/(\|[\s\S]*?){5}\|\s\s/gi, match => {
      return match.split(2) + "\n\n" + table.c;
    })

    // tables #hack hardcoded dimensions
    .replace(/(\|[\s\S]*?){5}\|/gi, match => {
      console.log(match);
      let str = tex.tableRow.o;

      let row = match.slice(1, -1);
      row.split("|").forEach(column => {
        str += column.trim() + tex.tableRow.separator;
      });
      str += tex.tableRow.c;
      console.log(str);
      return str;
    })*/

    // blockquotes
    .replace(/>>>[\s\S]*?>>>/gi, match => {
      return tex.code.o + match.slice(3, -3) + tex.code.c + tex.newLine;
    })

    // quotes
    /*.replace(/\".{1,50}?\"/gi, match => {
      return "\\glqq " + match.slice(1,-1) + "\\grqq{} ";
    })*/
    
    // markdown code field
    .replace(/```[\[\]a-zA-Z]{1,10}[\r\n](.|[\r\n])*?```/gi, match => {
      return tex.code.o + match.slice(3, -3) + tex.code.c;
    })

    // inline code
    .replace(/`.*?`/gi, match => {
      return tex.inlineCode.o + match.slice(1, -1) + tex.inlineCode.c;
    })

    // authors
    .replace(/Authors: .*?; Advisor: .*?[\r\n]/i, match => {
      let parts = match.split(";");
      let str = tex.authors.o;
      
      // Authors
      let authors = parts[0].slice(9).split(",");
      authors.forEach((author, i) => {
        let name = author.split(" ").join("~")
        str += name;
        if (i < authors.length - 1) {
          str += ","
        }
      })

      // Advisor
      let advisor = parts[1].slice(10, -1).split(" ").join("~");
      //str += "\\thanks{Advisor:" + advisor + "}";
      str += "\\\\Advisor: " + advisor;

      str += tex.authors.c;
      return str;
    })

    // paragraphs
    /*.replace(/[\r\n]{2}/g, match => {
      return "\\\\\n\n";
    })*/

    + tex.end;

    fs.writeFile(dest, s, "utf8", () => {
      console.log("worked");
      /*exec("pdflatex " + dest, (err, stdout, stderr) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log(stdout);
        console.log(stderr);
      });*/
    });
  });
}

parser("../README.md", "ieee.tex");