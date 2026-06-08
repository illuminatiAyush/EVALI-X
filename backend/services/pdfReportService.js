/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  PDF REPORT SERVICE — Professional Assessment Reports           ║
 * ║  Two report types: Student Report + Assessment Summary          ║
 * ║  Uses PDFKit for server-side generation                         ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const PDFDocument = require('pdfkit');
const { logger } = require('../utils/logger');

// ─── DESIGN TOKENS ───────────────────────────────────────────────
const COLORS = {
  brand: '#0d9488',
  brandLight: '#ccfbf1',
  text: '#18181b',
  textMuted: '#71717a',
  border: '#e4e4e7',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  white: '#ffffff',
  bgLight: '#fafafa',
};

class PdfReportService {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // REPORT TYPE 1: Individual Student Report
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  generateStudentReport(testData, studentEntry, questions, answers) {
    logger.info({ testId: testData.id, student: studentEntry.studentEmail }, '[REPORT] Generating student PDF');

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // ── HEADER ──
      doc.rect(0, 0, doc.page.width, 80).fill(COLORS.brand);
      doc.fontSize(22).fillColor(COLORS.white).font('Helvetica-Bold')
        .text('EVALIX', 50, 25, { continued: true })
        .fontSize(12).font('Helvetica')
        .text('  Assessment Report', { baseline: 'alphabetic' });
      doc.fontSize(9).fillColor(COLORS.brandLight)
        .text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 50, 52);

      doc.moveDown(3);
      doc.fillColor(COLORS.text);

      // ── ASSESSMENT INFO ──
      doc.fontSize(16).font('Helvetica-Bold')
        .text(testData.title || 'Assessment');
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.textMuted)
        .text(`Version ${testData.test_version || 1}  •  ${testData.total_questions || 0} Questions  •  ${testData.duration_minutes || 30} Minutes`);

      doc.moveDown(1.5);

      // ── STUDENT INFO BOX ──
      const infoY = doc.y;
      doc.rect(50, infoY, doc.page.width - 100, 80).lineWidth(1).strokeColor(COLORS.border).stroke();

      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.text);
      doc.text('Student:', 65, infoY + 12);
      doc.font('Helvetica').text(studentEntry.studentName, 130, infoY + 12);

      doc.font('Helvetica-Bold').text('Email:', 65, infoY + 30);
      doc.font('Helvetica').text(studentEntry.studentEmail, 130, infoY + 30);

      doc.font('Helvetica-Bold').text('Duration:', 65, infoY + 48);
      doc.font('Helvetica').text(`${studentEntry.durationMinutes} minutes`, 130, infoY + 48);

      // Right column
      doc.font('Helvetica-Bold').text('Score:', 320, infoY + 12);
      doc.font('Helvetica').text(`${studentEntry.score}/${studentEntry.maxScore} (${studentEntry.percentage}%)`, 380, infoY + 12);

      doc.font('Helvetica-Bold').text('Accuracy:', 320, infoY + 30);
      doc.font('Helvetica').text(`${studentEntry.accuracy}%`, 380, infoY + 30);

      doc.font('Helvetica-Bold').text('Violations:', 320, infoY + 48);
      const vColor = studentEntry.violationCount > 0 ? COLORS.danger : COLORS.success;
      doc.fillColor(vColor).text(`${studentEntry.violationCount}`, 380, infoY + 48);

      doc.fillColor(COLORS.text);
      doc.y = infoY + 100;

      // ── SCORE SUMMARY BAR ──
      const barY = doc.y;
      const barWidth = doc.page.width - 100;
      const filledWidth = (studentEntry.percentage / 100) * barWidth;
      doc.rect(50, barY, barWidth, 12).fillAndStroke(COLORS.border, COLORS.border);
      const barColor = studentEntry.percentage >= 80 ? COLORS.success : studentEntry.percentage >= 50 ? COLORS.brand : COLORS.danger;
      doc.rect(50, barY, filledWidth, 12).fill(barColor);
      doc.moveDown(1.5);

      // ── QUESTION-WISE ANALYSIS ──
      doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.text)
        .text('Question-wise Analysis');
      doc.moveDown(0.5);

      // Table header
      const tableX = 50;
      let tableY = doc.y;
      const colWidths = [30, 210, 120, 120, 30];

      doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.textMuted);
      doc.text('#', tableX, tableY);
      doc.text('Question', tableX + colWidths[0], tableY);
      doc.text('Your Answer', tableX + colWidths[0] + colWidths[1], tableY);
      doc.text('Correct Answer', tableX + colWidths[0] + colWidths[1] + colWidths[2], tableY);

      doc.moveTo(50, tableY + 14).lineTo(doc.page.width - 50, tableY + 14).strokeColor(COLORS.border).stroke();
      tableY += 20;

      // Table rows
      if (questions && questions.length > 0) {
        const answerKey = new Map(questions.map(q => [q.id, q.answer]));

        for (let i = 0; i < questions.length; i++) {
          // New page check
          if (tableY > doc.page.height - 80) {
            doc.addPage();
            tableY = 50;
          }

          const q = questions[i];
          const studentAns = answers[q.id] || '—';
          const correctAns = answerKey.get(q.id) || '—';
          const isCorrect = studentAns.trim().toLowerCase() === correctAns.trim().toLowerCase();

          doc.fontSize(8).font('Helvetica').fillColor(COLORS.text);
          doc.text(`${i + 1}`, tableX, tableY);

          const questionText = (q.question || '').substring(0, 55) + (q.question?.length > 55 ? '...' : '');
          doc.text(questionText, tableX + colWidths[0], tableY, { width: colWidths[1] - 10 });

          doc.fillColor(isCorrect ? COLORS.success : COLORS.danger);
          const ansText = (studentAns || '').substring(0, 30);
          doc.text(ansText, tableX + colWidths[0] + colWidths[1], tableY, { width: colWidths[2] - 10 });

          doc.fillColor(COLORS.success);
          const corText = (correctAns || '').substring(0, 30);
          doc.text(corText, tableX + colWidths[0] + colWidths[1] + colWidths[2], tableY, { width: colWidths[3] - 10 });

          // Status icon
          doc.fillColor(isCorrect ? COLORS.success : COLORS.danger)
            .text(isCorrect ? '✓' : '✗', tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], tableY);

          doc.fillColor(COLORS.text);
          tableY += 18;
        }
      }

      // ── VIOLATIONS ──
      if (studentEntry.violations && studentEntry.violations.length > 0) {
        if (tableY > doc.page.height - 120) doc.addPage();
        doc.y = tableY + 20;

        doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.text)
          .text('Violation Timeline');
        doc.moveDown(0.5);

        doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.textMuted);
        const vY = doc.y;
        doc.text('Type', 50, vY);
        doc.text('Severity', 200, vY);
        doc.text('Timestamp', 300, vY);
        doc.moveTo(50, vY + 14).lineTo(doc.page.width - 50, vY + 14).strokeColor(COLORS.border).stroke();

        let vy = vY + 20;
        for (const v of studentEntry.violations) {
          if (vy > doc.page.height - 60) { doc.addPage(); vy = 50; }
          doc.fontSize(8).font('Helvetica').fillColor(COLORS.text);
          doc.text(v.type || 'unknown', 50, vy);

          const sevColor = v.severity === 'HIGH' ? COLORS.danger : v.severity === 'MEDIUM' ? COLORS.warning : COLORS.textMuted;
          doc.fillColor(sevColor).text(v.severity || 'LOW', 200, vy);

          doc.fillColor(COLORS.text);
          doc.text(v.timestamp ? new Date(v.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—', 300, vy);
          vy += 14;
        }
      }

      // ── FOOTER ──
      doc.fontSize(7).fillColor(COLORS.textMuted)
        .text('Generated by Evalix Assessment Platform', 50, doc.page.height - 40, { align: 'center', width: doc.page.width - 100 });

      doc.end();
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // REPORT TYPE 2: Assessment Summary Report
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  generateSummaryReport(analyticsData) {
    const { test, overview, violationSummary, itemAnalysis, rawRoster } = analyticsData;
    logger.info({ testId: test?.id, students: rawRoster?.length }, '[REPORT] Generating summary PDF');

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // ── HEADER ──
      doc.rect(0, 0, doc.page.width, 80).fill(COLORS.brand);
      doc.fontSize(22).fillColor(COLORS.white).font('Helvetica-Bold')
        .text('EVALIX', 50, 25, { continued: true })
        .fontSize(12).font('Helvetica')
        .text('  Assessment Summary', { baseline: 'alphabetic' });
      doc.fontSize(9).fillColor(COLORS.brandLight)
        .text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 50, 52);

      doc.moveDown(3);
      doc.fillColor(COLORS.text);

      // ── ASSESSMENT INFO ──
      doc.fontSize(16).font('Helvetica-Bold')
        .text(test?.title || 'Assessment Summary');
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.textMuted)
        .text(`Version ${test?.test_version || 1}  •  ${test?.total_questions || 0} Questions  •  Status: ${test?.status}`);

      doc.moveDown(1.5);

      // ── OVERVIEW STATS ──
      doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.text).text('Performance Overview');
      doc.moveDown(0.5);

      const stats = [
        ['Class Average', `${overview.average}%`],
        ['Highest Score', `${overview.highest}%`],
        ['Lowest Score', `${overview.lowest}%`],
        ['Total Submissions', `${overview.totalSubmissions}`],
        ['Median Time', `${overview.medianTimeMinutes} min`],
      ];

      stats.forEach(([label, value]) => {
        doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.textMuted).text(label, 50, doc.y, { continued: true });
        doc.font('Helvetica').fillColor(COLORS.text).text(`  ${value}`);
      });

      doc.moveDown(1.5);

      // ── VIOLATION SUMMARY ──
      doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.text).text('Violation Summary');
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica');
      doc.fillColor(COLORS.textMuted).text('Low: ', { continued: true }).fillColor(COLORS.text).text(`${violationSummary.low}`, { continued: true });
      doc.fillColor(COLORS.textMuted).text('  •  Medium: ', { continued: true }).fillColor(COLORS.warning).text(`${violationSummary.medium}`, { continued: true });
      doc.fillColor(COLORS.textMuted).text('  •  High: ', { continued: true }).fillColor(COLORS.danger).text(`${violationSummary.high}`);

      doc.moveDown(1.5);

      // ── STUDENT RANKING TABLE ──
      doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.text).text('Student Rankings');
      doc.moveDown(0.5);

      // Header row
      let ty = doc.y;
      doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.textMuted);
      doc.text('Rank', 50, ty);
      doc.text('Name', 80, ty);
      doc.text('Email', 200, ty);
      doc.text('Score', 320, ty);
      doc.text('%', 365, ty);
      doc.text('Duration', 395, ty);
      doc.text('Violations', 450, ty);
      doc.text('Status', 505, ty);

      doc.moveTo(50, ty + 12).lineTo(doc.page.width - 50, ty + 12).strokeColor(COLORS.border).stroke();
      ty += 18;

      for (const s of rawRoster) {
        if (ty > doc.page.height - 60) { doc.addPage(); ty = 50; }

        doc.fontSize(7).font('Helvetica').fillColor(COLORS.text);
        doc.text(`#${s.rank}`, 50, ty);
        doc.text((s.studentName || '').substring(0, 20), 80, ty);
        doc.text((s.studentEmail || '').substring(0, 25), 200, ty);
        doc.text(`${s.score}/${s.maxScore}`, 320, ty);

        const pColor = s.percentage >= 80 ? COLORS.success : s.percentage >= 50 ? COLORS.brand : COLORS.danger;
        doc.fillColor(pColor).text(`${s.percentage}%`, 365, ty);

        doc.fillColor(COLORS.text).text(`${s.durationMinutes}m`, 395, ty);

        const vColor = s.violationCount > 0 ? COLORS.danger : COLORS.success;
        doc.fillColor(vColor).text(`${s.violationCount}`, 450, ty);

        doc.fillColor(COLORS.textMuted).text(s.attemptStatus, 505, ty);
        ty += 14;
      }

      doc.moveDown(2);

      // ── ITEM ANALYSIS ──
      if (ty > doc.page.height - 100) doc.addPage();
      doc.y = ty + 20;

      doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.text).text('Question Analysis');
      doc.moveDown(0.5);

      ty = doc.y;
      doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.textMuted);
      doc.text('#', 50, ty);
      doc.text('Question', 70, ty);
      doc.text('Accuracy', 340, ty);
      doc.text('Correct', 400, ty);
      doc.text('Wrong', 440, ty);
      doc.text('Skipped', 480, ty);
      doc.moveTo(50, ty + 12).lineTo(doc.page.width - 50, ty + 12).strokeColor(COLORS.border).stroke();
      ty += 18;

      itemAnalysis.forEach((item, idx) => {
        if (ty > doc.page.height - 60) { doc.addPage(); ty = 50; }

        doc.fontSize(7).font('Helvetica').fillColor(COLORS.text);
        doc.text(`${idx + 1}`, 50, ty);
        doc.text(item.questionSnippet, 70, ty, { width: 260 });

        const aColor = item.accuracy >= 80 ? COLORS.success : item.accuracy >= 50 ? COLORS.brand : COLORS.danger;
        doc.fillColor(aColor).text(`${item.accuracy}%`, 340, ty);

        doc.fillColor(COLORS.success).text(`${item.correct}`, 400, ty);
        doc.fillColor(COLORS.danger).text(`${item.wrong}`, 440, ty);
        doc.fillColor(COLORS.textMuted).text(`${item.skipped}`, 480, ty);
        ty += 14;
      });

      // ── FOOTER ──
      doc.fontSize(7).fillColor(COLORS.textMuted)
        .text('Generated by Evalix Assessment Platform', 50, doc.page.height - 40, { align: 'center', width: doc.page.width - 100 });

      doc.end();
    });
  }
}

module.exports = new PdfReportService();
