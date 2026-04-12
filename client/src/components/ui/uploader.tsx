import { ChangeEvent } from 'react';
import { Label } from './label';

interface UploaderProps {
	id: string;
	handleFirebaseFile: (e: ChangeEvent<HTMLInputElement>, type: string) => Promise<void>;
	firebaseError: string | null;
	firebaseConfig: { projectId: string } | null;
}

const Uploader = ({ id, handleFirebaseFile, firebaseError, firebaseConfig }: UploaderProps) => (
	<div className='space-y-3'>
		<Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground/70'>
			Firebase Service Account
		</Label>

		<label htmlFor={id} className='block cursor-pointer'>
			<input
				id={id}
				type='file'
				accept='application/json'
				onChange={(e) => handleFirebaseFile(e, id)}
				className='hidden'
			/>

			<div
				className={`p-5 rounded-xl border border-dashed transition-all text-center
      ${
			firebaseError
				? 'border-red-500/40 bg-red-500/5'
				: firebaseConfig
					? 'border-green-500/40 bg-green-500/5'
					: 'border-white/10 bg-white/[0.03] hover:border-white/20'
		}
      `}
			>
				<div className='space-y-2'>
					<p className='text-sm text-white font-medium'>
						{firebaseConfig ? 'Service account loaded' : 'Click to upload JSON'}
					</p>

					<p className='text-xs text-muted-foreground'>
						{firebaseConfig
							? firebaseConfig.projectId
							: 'Only Firebase service account files'}
					</p>

					{firebaseError && <p className='text-xs text-red-400'>{firebaseError}</p>}
				</div>
			</div>
		</label>
	</div>
);

export { Uploader };
