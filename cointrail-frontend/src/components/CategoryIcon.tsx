import { Icon } from './ui/Icon';

// There is no reliable category icon key in the API. Historical and custom names
// use the same glyph and never influence color or require another request.
export default function CategoryIcon({ size = 'normal' }: { size?: 'small' | 'normal' }) {
    return <span aria-hidden="true" className={`ct-category-icon ct-category-icon--${size}`}><Icon name="tag" /></span>;
}
