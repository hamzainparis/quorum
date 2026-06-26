import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnChanges,
  SimpleChanges,
  effect,
  inject,
  input,
  output,
  SecurityContext,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

interface FormatBtn {
  cmd: string;
  arg?: string;
  icon: string;
  title: string;
}

const TOOLBAR: (FormatBtn | 'sep')[] = [
  { cmd: 'bold',          icon: '<b>B</b>',       title: 'Bold (Ctrl+B)' },
  { cmd: 'italic',        icon: '<i>I</i>',       title: 'Italic (Ctrl+I)' },
  { cmd: 'underline',     icon: '<u>U</u>',       title: 'Underline (Ctrl+U)' },
  'sep',
  { cmd: 'formatBlock', arg: 'h3', icon: 'H3',   title: 'Heading 3' },
  { cmd: 'formatBlock', arg: 'h4', icon: 'H4',   title: 'Heading 4' },
  { cmd: 'formatBlock', arg: 'p',  icon: '¶',    title: 'Paragraph' },
  'sep',
  { cmd: 'insertUnorderedList', icon: '• —',     title: 'Bullet list' },
  { cmd: 'insertOrderedList',   icon: '1. —',    title: 'Numbered list' },
];

@Component({
  selector: 'qrm-rich-editor',
  templateUrl: './rich-editor.html',
  styleUrl: './rich-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichEditor implements AfterViewInit, OnChanges {
  value = input('');
  placeholder = input('Add a description…');

  readonly valueChange = output<string>();

  readonly toolbar = TOOLBAR;
  readonly editorEl = viewChild.required<ElementRef<HTMLDivElement>>('editor');

  readonly isEmpty = signal(true);

  private readonly sanitizer = inject(DomSanitizer);
  private skipNextInputSync = false;

  // Incoming value can originate from sources other than this editor's own output
  // (e.g. an existing ticket description), so it's sanitized before reaching innerHTML —
  // contenteditable writes bypass Angular's template [innerHTML] sanitizer entirely.
  private sanitize(html: string): string {
    return this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '';
  }

  ngAfterViewInit(): void {
    const el = this.editorEl().nativeElement;
    if (this.value()) {
      el.innerHTML = this.sanitize(this.value());
      this.isEmpty.set(el.textContent?.trim() === '');
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && !changes['value'].firstChange && !this.skipNextInputSync) {
      const el = this.editorEl()?.nativeElement;
      if (el && el.innerHTML !== this.value()) {
        el.innerHTML = this.sanitize(this.value());
        this.isEmpty.set(el.textContent?.trim() === '');
      }
    }
    this.skipNextInputSync = false;
  }

  onInput(): void {
    const el = this.editorEl().nativeElement;
    this.isEmpty.set(el.textContent?.trim() === '');
    this.skipNextInputSync = true;
    this.valueChange.emit(el.innerHTML);
  }

  format(cmd: string, arg?: string): void {
    document.execCommand(cmd, false, arg ?? undefined);
    this.editorEl().nativeElement.focus();
    this.onInput();
  }

  isSep(item: FormatBtn | 'sep'): item is 'sep' {
    return item === 'sep';
  }

  asBtn(item: FormatBtn | 'sep'): FormatBtn {
    return item as FormatBtn;
  }
}
