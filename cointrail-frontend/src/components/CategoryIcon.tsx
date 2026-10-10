import { Icon } from './ui/Icon';
import { categoryGlyph } from './categoryGlyph';

// Reference DTOs omit system status; known name/type pairs are decorative only.
export default function CategoryIcon({ size = 'normal', ...metadata }: { size?: 'small' | 'normal'; name?: string; type?: string; system?: boolean }) {
    return <span aria-hidden="true" className={`ct-category-icon ct-category-icon--${size}`}><Icon name={categoryGlyph(metadata)} /></span>;
}
