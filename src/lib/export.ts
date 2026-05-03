export const exportToCSV = (filename: string, data: any[]) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(fieldName => {
        let value = row[fieldName];
        if (value === null || value === undefined) value = '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Exports data to a formatted HTML-based XLS file that Excel can read with styles (colors, etc.)
 */
export const exportToExcelFormatted = (filename: string, title: string, data: any[], themeColor: string = '#10b981') => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      <style>
        table { border-collapse: collapse; width: 100%; font-family: sans-serif; }
        th { background-color: ${themeColor}; color: white; font-weight: bold; padding: 10px; border: 1px solid #ccc; text-align: left; }
        td { padding: 8px; border: 1px solid #ccc; font-size: 12px; }
        .title { font-size: 18px; font-weight: bold; margin-bottom: 20px; color: #333; }
        .odd { background-color: #f9f9f9; }
        .number { text-align: right; }
        .status { font-weight: bold; text-align: center; }
      </style>
    </head>
    <body>
      <div class="title">${title}</div>
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map((row, i) => `
            <tr class="${i % 2 === 0 ? '' : 'odd'}">
              ${headers.map(h => {
                const val = row[h];
                const isNumber = typeof val === 'number';
                return `<td class="${isNumber ? 'number' : ''}">${val !== null && val !== undefined ? val : ''}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
