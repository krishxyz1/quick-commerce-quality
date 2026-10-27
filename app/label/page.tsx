import type { Metadata } from 'next';
import { LabelForm } from '@/components/LabelForm';
import { complaints, summary } from '@/lib/data';

export const metadata: Metadata = { title: 'Label a review' };

// Three real reviews from the dataset, chosen to show different labels.
const pick = (pred: (c: (typeof complaints)[number]) => boolean) => complaints.find(pred);
const examples = [
  pick((c) => c.issues.includes('freshness') && c.category === 'dairy_eggs' && c.text.length < 160),
  pick((c) => c.issues.includes('missing_item') && c.issues.includes('refund_support') && c.text.length < 160),
  pick((c) => c.issues.includes('damaged') && c.category === 'fruits_veg' && c.text.length < 160),
]
  .filter((c): c is NonNullable<typeof c> => Boolean(c))
  .map((c) => ({ app: summary.apps.find((a) => a.key === c.app)!.name, text: c.text }));

export default function LabelPage() {
  return (
    <>
      <div className="title-row">
        <div>
          <h1>Label a review</h1>
          <p className="subtitle">
            The same labels used on all {summary.totalReviews.toLocaleString('en-IN')} reviews, run live on one you paste.
          </p>
        </div>
      </div>
      <LabelForm examples={examples} />
    </>
  );
}
