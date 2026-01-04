import { evaluateAssignment } from './utils/evaluateAssignment.js';

// Test cases
const testCases = {
  code: {
    type: 'code',
    text_fields: `
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Test
console.log(fibonacci(10));
    `,
    link_fields: ' `https://github.com/example/fibonacci` '
  },
  
  design: {
    type: 'design',
    text_fields: 'Created a modern landing page with responsive design. Used Figma for UI and Adobe XD for prototyping.',
    link_fields: ' `https://behance.net/example\nhttps://figma.com/example` '
  },
  
  text: {
    type: 'text',
    text_fields: 'In this analysis, I examined the market trends for Q4 2025. The data shows a significant increase in AI adoption across all sectors...',
    link_fields: null
  }
};

const jobCriteria = {
  required_skills: ['JavaScript', 'Algorithms'],
  assignment_description: 'Implement a fibonacci function efficiently',
  weights: {
    code_quality: 0.3,
    problem_solving: 0.4,
    technical_skills: 0.2,
    documentation: 0.1
  }
};

async function test() {
  console.log('='.repeat(50));
  console.log('Testing Code Assignment...');
  console.log('='.repeat(50));
  const resultCode = await evaluateAssignment(testCases.code, jobCriteria);
  console.log(JSON.stringify(resultCode, null, 2));

  console.log('\n' + '='.repeat(50));
  console.log('Testing Design Assignment...');
  console.log('='.repeat(50));
  const resultDesign = await evaluateAssignment(testCases.design, {
    required_skills: ['UI/UX', 'Figma'],
    assignment_description: 'Design a landing page',
    weights: { creativity: 0.4, technical_execution: 0.3, presentation: 0.2, relevance: 0.1 }
  });
  console.log(JSON.stringify(resultDesign, null, 2));
}

test();
