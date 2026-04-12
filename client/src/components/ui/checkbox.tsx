import { SetStateAction } from 'react';

type FirebaseMode = 'rtdb' | 'firestore';
``;
interface CheckBoxProps {
	options: { label: string; value: string }[];
	firebaseMode: string;
	onClick: (value: SetStateAction<FirebaseMode>) => void;
}

const CheckBox = ({ options, firebaseMode, onClick }: CheckBoxProps) => {
	return (
		<div className='grid grid-cols-2 gap-3'>
			{options.map((item) => {
				const active = firebaseMode === item.value;
				return (
					<button
						key={item.value}
						type='button'
						onClick={() => onClick(item.value as FirebaseMode)}
						className={`relative p-4 rounded-xl border transition-all text-left
        ${
			active
				? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/10'
				: 'bg-white/[0.03] border-white/10 hover:border-white/20'
		}
        `}
					>
						<div className='flex items-center justify-between'>
							<span className='text-sm font-medium text-white'>{item.label}</span>

							{/* indicator */}
							<div
								className={`h-4 w-4 rounded-full border flex items-center justify-center
            ${active ? 'border-indigo-400' : 'border-white/30'}
            `}
							>
								{active && <div className='h-2 w-2 rounded-full bg-indigo-400' />}
							</div>
						</div>
					</button>
				);
			})}
		</div>
	);
};

export { CheckBox };
