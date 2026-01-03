# SmartRecruit AI - Applicant Multi-Step Form

A modern, production-ready multi-step job application form built with Next.js 14, TypeScript, and Tailwind CSS. Features forward-only navigation, RTL support, and clean component architecture.

## 🚀 Features

- **Forward-only navigation** - Users can only move forward through the form
- **Step progress indicator** - Clear "Step X of Y" progression
- **Form validation** - Built-in validation with error handling
- **RTL support** - Right-to-left layout support for internationalization
- **Responsive design** - Mobile-first responsive design
- **Clean component architecture** - Reusable, maintainable components
- **TypeScript** - Full type safety throughout the application
- **Tailwind CSS** - Utility-first CSS framework for rapid development

## 📁 Project Structure

```
src/
├── app/                          # Next.js 14 App Router
│   ├── globals.css              # Global styles and CSS variables
│   ├── layout.tsx               # Root layout component
│   └── page.tsx                 # Home page with form implementation
├── components/
│   ├── ui/                      # Reusable UI components
│   │   ├── button.tsx           # Button component
│   │   ├── card.tsx             # Card layout components
│   │   ├── input.tsx            # Text input component
│   │   ├── label.tsx            # Label component
│   │   ├── progress.tsx         # Progress bar component
│   │   └── textarea.tsx         # Textarea component
│   └── form/                    # Form-specific components
│       ├── form-step.tsx        # Individual step component
│       ├── multi-step-form.tsx  # Main form orchestrator
│       └── questions.tsx        # Question type components
├── lib/
│   └── utils.ts                 # Utility functions
└── types/
    └── form.ts                  # TypeScript type definitions
```

## 🛠️ Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   # or
   pnpm dev
   # or
   yarn dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🤖 AI Platform Setup (Dependencies Only — No Functional AI Code Yet)

This repo now includes **two additional folders** for the AI-powered hiring platform setup:

- `backend/` — Node.js backend dependencies (Express + parsing + Ollama client + Supabase client)
- `ai-server/` — Python AI service dependencies (Flask + Whisper packages)

### 1) Node.js Backend (`backend/`)

**Installed dependencies (in `backend/package.json`):**
- `express`
- `multer`
- `pdf-parse`
- `mammoth`
- `puppeteer`
- `ollama`
- `@supabase/supabase-js`
- `axios`
- `cors`
- `dotenv`

**Install:**
```bash
cd backend
npm install
```

### 2) Python AI Server (`ai-server/`)

**Pinned dependencies (in `ai-server/requirements.txt`):**
- `flask`
- `flask-cors`
- `python-dotenv`
- `openai-whisper`
- `faster-whisper`

**Install (recommended via venv):**
```bash
cd ai-server
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

> Important: For `openai-whisper` / `faster-whisper`, use **Python 3.10–3.12**.  
> Python **3.14** is very new and may fail to install Whisper dependencies.
>
> Also note: these packages can be **heavy** and may require **FFmpeg** and a compatible **PyTorch** installation depending on your environment.

### 3) Ollama Setup

**Install Ollama:**
- Download and install from: `https://ollama.com/download`

**Pull model:**
```bash
ollama pull llama3.2:3b
```

**Verify:**
```bash
ollama list
```

## 🎯 How Components Connect

### 1. **Page Component** (`src/app/page.tsx`)
- Entry point that renders the main application
- Contains sample form configuration (`sampleFormSteps`)
- Manages overall application state (RTL toggle, submission state)
- Passes configuration to the main form component

### 2. **Multi-Step Form** (`src/components/form/multi-step-form.tsx`)
- **Main orchestrator** that manages the entire form flow
- Handles:
  - Current step tracking
  - Form data state management
  - Step navigation (forward-only)
  - Form validation
  - Progress calculation
  - Completion handling

### 3. **Form Step Component** (`src/components/form/form-step.tsx`)
- Renders individual form steps
- Maps question types to appropriate components
- Handles field-level data binding
- Displays step title and description

### 4. **Question Components** (`src/components/form/questions.tsx`)
- Specialized components for each question type:
  - `TextQuestion` - Short text inputs
  - `NumberQuestion` - Number inputs with validation
  - `TextareaQuestion` - Long text areas
- Each component handles:
  - Field-specific rendering
  - Input validation
  - Error display
  - RTL text direction

### 5. **UI Components** (`src/components/ui/`)
- Base components built with Radix UI primitives
- Styled with Tailwind CSS
- Include accessibility features
- Used throughout the form components

## 📝 Form Configuration

Forms are configured using the `FormStep[]` type:

```typescript
interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

interface FormField {
  id: string;
  type: 'text' | 'number' | 'textarea';
  label: string;
  placeholder?: string;
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
}
```

### Example Configuration:
```typescript
const sampleFormSteps: FormStep[] = [
  {
    id: 'personal-info',
    title: 'Personal Information',
    description: 'Tell us about yourself',
    fields: [
      {
        id: 'firstName',
        type: 'text',
        label: 'First Name',
        placeholder: 'Enter your first name',
        required: true
      },
      {
        id: 'yearsExperience',
        type: 'number',
        label: 'Years of Experience',
        placeholder: '5',
        required: true,
        validation: {
          min: 0,
          max: 50
        }
      }
    ]
  }
];
```

## 🔧 Customization

### Adding New Question Types:
1. Add the new type to `src/types/form.ts`
2. Create a new component in `src/components/form/questions.tsx`
3. Update `FormStepComponent` to handle the new type

### Styling Customization:
- Modify CSS variables in `src/app/globals.css`
- Update Tailwind configuration in `tailwind.config.js`
- Customize component styles in individual component files

### Validation Rules:
Add validation to field configuration:
```typescript
{
  id: 'email',
  type: 'text',
  label: 'Email Address',
  required: true,
  validation: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address'
  }
}
```

## 🌍 RTL Support

The form includes built-in RTL (Right-to-Left) support:
- Toggle RTL mode with the checkbox in the header
- All text inputs automatically adjust direction
- Layout components respect RTL settings
- Component alignment adapts to RTL layout

## 📱 Responsive Design

- Mobile-first approach
- Optimized for tablets and desktop
- Touch-friendly interface
- Accessible on all screen sizes

## 🔒 Data Handling

- **No backend integration** - All data handled in component state
- **No data persistence** - Form data cleared on page refresh
- **Client-side validation** - Immediate feedback to users
- **Type-safe data flow** - Full TypeScript coverage

## 🎨 Design System

Built with a consistent design system:
- **Colors**: CSS custom properties for easy theming
- **Typography**: Inter font family
- **Spacing**: Consistent spacing scale
- **Components**: Reusable, composable components
- **Icons**: Lucide React icon library

## 🚦 Next Steps for Phase 2

- [ ] Voice recording integration
- [ ] File upload functionality
- [ ] Form data persistence
- [ ] Backend API integration
- [ ] Advanced question types (radio, checkbox, select)
- [ ] Dynamic form generation from API
- [ ] Form analytics and tracking
- [ ] Multi-language support

## 📄 File Structure in Next.js App

When implementing in your Next.js project:

1. **Create the app directory structure:**
   ```
   your-project/
   ├── src/
   │   ├── app/
   │   │   ├── page.tsx          # Your main form page
   │   │   ├── layout.tsx        # Root layout
   │   │   └── globals.css       # Global styles
   │   ├── components/
   │   │   ├── ui/              # Copy all UI components
   │   │   └── form/            # Copy all form components
   │   ├── lib/
   │   │   └── utils.ts         # Copy utility functions
   │   └── types/
   │       └── form.ts          # Copy type definitions
   ├── tailwind.config.js       # Update with proper config
   ├── next.config.js           # Next.js configuration
   └── package.json             # Update dependencies
   ```

2. **Install required dependencies:**
   ```bash
   npm install next@14 react@18 react-dom@18
   npm install @radix-ui/react-progress
   npm install lucide-react
   npm install clsx tailwind-merge
   npm install -D tailwindcss postcss autoprefixer
   npm install -D typescript @types/react @types/node eslint eslint-config-next
   ```

3. **Configure Tailwind CSS** with the provided configuration

This implementation provides a solid foundation for a hiring platform's application form, with clean architecture and room for future enhancements.