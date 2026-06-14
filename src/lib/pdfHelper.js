import { jsPDF } from 'jspdf';

// Reusable custom markdown-to-PDF parser/renderer
export const downloadAsPDF = async (title, content, typeLabel) => {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const marginL = 15;
    const marginR = 15;
    const marginT = 20;
    const marginB = 18;
    const maxW = pageW - marginL - marginR;
    let y = marginT;

    const newPage = () => { pdf.addPage(); y = marginT; };
    const checkPage = (h) => { if (y + h > pageH - marginB) newPage(); };

    // ── Clean inline markdown + math formulas ──────────────────────────────
    const cleanLine = (text) => {
      if (!text) return '';
      return String(text)
        // LaTeX display math $$...$$ → strip
        .replace(/\$\$([^$]*)\$\$/g, (_, inner) => {
          const t = inner.trim();
          return t.length > 0 && t.length < 80 ? `[${t}]` : '[Formula]';
        })
        // LaTeX inline math $...$ → strip
        .replace(/\$([^$\n]{1,120})\$/g, (_, inner) => {
          const t = inner.trim();
          return t.length > 0 && t.length < 80 ? `[${t}]` : '[Formula]';
        })
        // Lone $ leftover
        .replace(/\$/g, '')
        // Bold
        .replace(/\*\*(.+?)\*\*/gs, '$1')
        // Italic
        .replace(/\*(.+?)\*/gs, '$1')
        // Inline code
        .replace(/`([^`]+)`/g, '$1')
        // Strikethrough
        .replace(/~~(.+?)~~/g, '$1')
        // Links
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        // Trailing whitespace
        .trim();
    };

    const drawWrapped = (text, x, w, fontSize, style, color, lh) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', style);
      pdf.setTextColor(...color);
      const lines = pdf.splitTextToSize(text, w);
      lines.forEach(l => { checkPage(lh); pdf.text(l, x, y); y += lh; });
    };

    // ── Render a markdown table (array of row-arrays) ─────────────────────
    const renderTable = (rows) => {
      if (rows.length === 0) return;
      const cols = rows[0].length;
      if (cols === 0) return;

      const cellPad = 2.5;
      const rowH = 7;
      const fontSize = 8.5;
      const colW = maxW / cols;

      // Header row
      checkPage(rowH + 2);
      const startX = marginL;
      let cx = startX;

      // Header background
      pdf.setFillColor(79, 70, 229);
      pdf.rect(startX, y - rowH + 2, maxW, rowH, 'F');

      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);

      rows[0].forEach((cell, ci) => {
        const cellText = cleanLine(cell);
        const lines = pdf.splitTextToSize(cellText, colW - cellPad * 2);
        pdf.text(lines[0] || '', cx + cellPad, y, { maxWidth: colW - cellPad * 2 });
        cx += colW;
      });
      // Header border
      pdf.setDrawColor(255, 255, 255);
      pdf.setLineWidth(0.2);
      for (let ci = 1; ci < cols; ci++) {
        pdf.line(startX + ci * colW, y - rowH + 2, startX + ci * colW, y + 2);
      }
      y += rowH - 3;

      // Data rows
      rows.slice(1).forEach((row, ri) => {
        let maxLines = 1;
        row.forEach(cell => {
          const lines = pdf.splitTextToSize(cleanLine(cell), colW - cellPad * 2);
          if (lines.length > maxLines) maxLines = lines.length;
        });
        const thisRowH = Math.max(rowH, maxLines * 4.5 + cellPad * 2);
        checkPage(thisRowH);

        if (ri % 2 === 0) {
          pdf.setFillColor(248, 248, 252);
          pdf.rect(startX, y - 4, maxW, thisRowH, 'F');
        }

        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(40, 40, 50);

        cx = startX;
        row.forEach((cell, ci) => {
          const cellText = cleanLine(cell);
          const lines = pdf.splitTextToSize(cellText, colW - cellPad * 2);
          lines.forEach((l, li) => {
            pdf.text(l, cx + cellPad, y + li * 4.2);
          });
          cx += colW;
        });

        pdf.setDrawColor(220, 220, 230);
        pdf.setLineWidth(0.2);
        pdf.line(startX, y + thisRowH - 4, startX + maxW, y + thisRowH - 4);

        for (let ci = 1; ci < cols; ci++) {
          pdf.line(startX + ci * colW, y - 4, startX + ci * colW, y + thisRowH - 4);
        }

        y += thisRowH - 2;
      });

      pdf.setDrawColor(180, 180, 200);
      pdf.setLineWidth(0.3);
      pdf.rect(startX, y - (rows.length) * rowH + 4, maxW, (rows.length) * rowH, 'S');

      y += 4;
    };

    // ── PDF branded header bar ────────────────────────────────────────────
    pdf.setFillColor(79, 70, 229);
    pdf.rect(0, 0, pageW, 11, 'F');
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('TaniOS AI — Study Material', marginL, 7.5);
    pdf.text(new Date().toLocaleDateString('en-IN'), pageW - marginR, 7.5, { align: 'right' });
    y = 19;

    // Title
    pdf.setFontSize(17);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(22, 22, 28);
    const titleLines = pdf.splitTextToSize(title, maxW);
    titleLines.forEach(l => { pdf.text(l, marginL, y); y += 8; });

    // Subtitle
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 130);
    pdf.text(
      `${typeLabel} · Generated on ${new Date().toLocaleDateString('en-IN')}`,
      marginL, y
    );
    y += 4.5;

    // Divider
    pdf.setDrawColor(210, 210, 220);
    pdf.setLineWidth(0.35);
    pdf.line(marginL, y, pageW - marginR, y);
    y += 6;

    // ── Pre-process: group lines into blocks ──────────────────────────────
    const rawLines = (content || '').split('\n');
    let i = 0;

    while (i < rawLines.length) {
      const raw = rawLines[i];
      const line = raw.trimEnd();

      if (line.startsWith('```')) {
        const codeLines = [];
        i++;
        while (i < rawLines.length && !rawLines[i].startsWith('```')) {
          codeLines.push(rawLines[i]);
          i++;
        }
        i++;
        if (codeLines.length > 0) {
          const blockH = codeLines.length * 4.2 + 6;
          checkPage(blockH);
          pdf.setFillColor(244, 244, 248);
          pdf.setDrawColor(200, 200, 215);
          pdf.setLineWidth(0.25);
          pdf.roundedRect(marginL, y - 1, maxW, blockH, 1.5, 1.5, 'FD');
          pdf.setFontSize(8);
          pdf.setFont('courier', 'normal');
          pdf.setTextColor(55, 55, 75);
          codeLines.forEach(cl => {
            checkPage(4.2);
            pdf.text(cl || ' ', marginL + 3, y + 3);
            y += 4.2;
          });
          y += 5;
        }
        continue;
      }

      if (/^\|/.test(line)) {
        const tableRows = [];
        while (i < rawLines.length && /^\|/.test(rawLines[i].trimEnd())) {
          const rowLine = rawLines[i].trim();
          i++;
          if (/^\|[\s:|-]+\|$/.test(rowLine)) continue;
          const cells = rowLine
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map(c => c.trim());
          tableRows.push(cells);
        }
        if (tableRows.length > 0) renderTable(tableRows);
        continue;
      }

      if (line.trim() === '') { y += 2.5; i++; continue; }

      if (/^[-*_]{3,}$/.test(line.trim())) {
        checkPage(4);
        pdf.setDrawColor(200, 200, 210);
        pdf.setLineWidth(0.3);
        pdf.line(marginL, y, pageW - marginR, y);
        y += 5;
        i++; continue;
      }

      if (/^# /.test(line)) {
        const text = cleanLine(line.replace(/^# /, ''));
        y += 2;
        checkPage(9);
        pdf.setFontSize(14.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(35, 35, 45);
        pdf.splitTextToSize(text, maxW).forEach(l => { checkPage(7); pdf.text(l, marginL, y); y += 7; });
        pdf.setDrawColor(79, 70, 229);
        pdf.setLineWidth(0.5);
        pdf.line(marginL, y, marginL + Math.min(45, pdf.getTextWidth(text) + 2), y);
        y += 4;
        i++; continue;
      }

      if (/^## /.test(line)) {
        const text = cleanLine(line.replace(/^## /, ''));
        y += 2;
        checkPage(8);
        pdf.setFontSize(12.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(45, 45, 60);
        pdf.splitTextToSize(text, maxW).forEach(l => { checkPage(6.5); pdf.text(l, marginL, y); y += 6.5; });
        y += 1;
        i++; continue;
      }

      if (/^### /.test(line)) {
        const text = cleanLine(line.replace(/^### /, ''));
        y += 1;
        checkPage(6);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(55, 55, 70);
        pdf.splitTextToSize(text, maxW).forEach(l => { checkPage(6); pdf.text(l, marginL, y); y += 6; });
        i++; continue;
      }

      if (/^#{4,6} /.test(line)) {
        const text = cleanLine(line.replace(/^#{4,6} /, ''));
        drawWrapped(text, marginL, maxW, 10, 'bold', [65, 65, 80], 5.5);
        i++; continue;
      }

      if (/^(\s*)([-*+]) /.test(line)) {
        const indentSpaces = line.match(/^(\s*)/)[1].length;
        const indent = Math.min(indentSpaces / 2, 3) * 4;
        const text = cleanLine(line.replace(/^\s*[-*+] /, ''));
        checkPage(5.5);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(40, 40, 45);
        pdf.setFillColor(79, 70, 229);
        pdf.circle(marginL + indent + 1.5, y - 1.5, 0.85, 'F');
        const wrapped = pdf.splitTextToSize(text, maxW - indent - 5);
        wrapped.forEach(l => { checkPage(5.5); pdf.text(l, marginL + indent + 5, y); y += 5.5; });
        i++; continue;
      }

      if (/^\s*\d+\. /.test(line)) {
        const num = line.match(/^\s*(\d+)\./)[1];
        const text = cleanLine(line.replace(/^\s*\d+\. /, ''));
        checkPage(5.5);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(79, 70, 229);
        pdf.text(`${num}.`, marginL, y);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(40, 40, 45);
        pdf.splitTextToSize(text, maxW - 8).forEach(l => { checkPage(5.5); pdf.text(l, marginL + 8, y); y += 5.5; });
        i++; continue;
      }

      if (/^> /.test(line)) {
        const text = cleanLine(line.replace(/^> /, ''));
        const wrapped = pdf.splitTextToSize(text, maxW - 7);
        const bh = wrapped.length * 5 + 4;
        checkPage(bh);
        pdf.setFillColor(242, 241, 255);
        pdf.rect(marginL, y - 3.5, maxW, bh, 'F');
        pdf.setFillColor(79, 70, 229);
        pdf.rect(marginL, y - 3.5, 2.5, bh, 'F');
        pdf.setFontSize(9.5);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(55, 55, 75);
        wrapped.forEach(l => { pdf.text(l, marginL + 5, y); y += 5; });
        y += 2;
        i++; continue;
      }

      const text = cleanLine(line);
      if (text) drawWrapped(text, marginL, maxW, 10, 'normal', [38, 38, 45], 5.5);
      i++;
    }

    // ── Footer on all pages ───────────────────────────────────────────────
    const totalPages = pdf.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      pdf.setDrawColor(210, 210, 220);
      pdf.setLineWidth(0.25);
      pdf.line(marginL, pageH - 11, pageW - marginR, pageH - 11);
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(150, 150, 160);
      pdf.text('Generated by TaniOS AI · tanios.ai', marginL, pageH - 7);
      pdf.text(`Page ${p} / ${totalPages}`, pageW - marginR, pageH - 7, { align: 'right' });
    }

    pdf.save(`${title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_') || 'TaniOS_Study_Material'}.pdf`);
  } catch (e) {
    console.error('PDF generation error:', e);
  }
};
