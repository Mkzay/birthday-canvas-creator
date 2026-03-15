import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCallback, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
}

function getTextLength(html: string): number {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return (temp.textContent || '').length;
}

interface ToolbarButtonProps {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  label: string;
}

const ToolbarButton = ({ active, onClick, disabled, children, label }: ToolbarButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className={cn(
      'inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
      active
        ? 'bg-primary/14 text-primary'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      disabled && 'pointer-events-none opacity-40',
    )}
  >
    {children}
  </button>
);

const RichTextEditor = ({ value, onChange, placeholder, maxLength = 500, disabled, className }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      Placeholder.configure({ placeholder: placeholder || 'Write your message...' }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      if (maxLength && getTextLength(html) > maxLength) {
        return;
      }
      onChange(html);
    },
  });

  useEffect(() => {
    if (editor && disabled !== undefined) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  const textLength = getTextLength(value);

  const toggle = useCallback(
    (name: string, attrs?: Record<string, unknown>) => {
      if (!editor) return;
      if (name === 'bulletList') editor.chain().focus().toggleBulletList().run();
      else if (name === 'orderedList') editor.chain().focus().toggleOrderedList().run();
      else editor.chain().focus().toggleMark(name, attrs).run();
    },
    [editor],
  );

  if (!editor) return null;

  return (
    <div className={cn('rounded-xl border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2', disabled && 'cursor-not-allowed opacity-50', className)}>
      <div className="flex items-center gap-0.5 border-b border-input px-2 py-1.5">
        <ToolbarButton active={editor.isActive('bold')} onClick={() => toggle('bold')} disabled={disabled} label="Bold">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('italic')} onClick={() => toggle('italic')} disabled={disabled} label="Italic">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('underline')} onClick={() => toggle('underline')} disabled={disabled} label="Underline">
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton active={editor.isActive('bulletList')} onClick={() => toggle('bulletList')} disabled={disabled} label="Bullet list">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('orderedList')} onClick={() => toggle('orderedList')} disabled={disabled} label="Ordered list">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <span className="ml-auto text-xs text-muted-foreground">{textLength}/{maxLength}</span>
      </div>
      <EditorContent editor={editor} className="rich-text-editor-content" />
    </div>
  );
};

export default RichTextEditor;
