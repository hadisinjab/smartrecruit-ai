import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import fs from 'fs';

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          text: 'John Doe',
          heading: HeadingLevel.TITLE,
        }),
        new Paragraph({
          text: 'Software Engineer | john.doe@example.com | +1234567890 | New York, USA',
        }),
        new Paragraph({
          text: 'Summary',
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: 'Passionate software engineer with 5 years of experience in Node.js and React. Proven track record of delivering scalable web applications.',
        }),
        new Paragraph({
          text: 'Experience',
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: 'Senior Developer at Tech Corp (2020 - Present)',
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          text: 'Led a team of 5 developers. Built microservices using Node.js and Docker.',
        }),
        new Paragraph({
          text: 'Education',
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: 'BSc Computer Science - University of Technology (2016 - 2020)',
        }),
        new Paragraph({
          text: 'Skills',
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: 'JavaScript, TypeScript, React, Node.js, SQL, AWS',
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('backend/simple_cv.docx', buffer);
  console.log('Simple CV created: backend/simple_cv.docx');
});
