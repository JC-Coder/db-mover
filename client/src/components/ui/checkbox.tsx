import { SetStateAction } from 'react';

type FirebaseMode = 'rtdb' | 'firestore';

interface CheckBoxProps {
	options: { label: string; value: string }[];
	firebaseMode: string;
	onClick: (value: SetStateAction<FirebaseMode>) => void;
	activeColor?: string;
	inactiveColor?: string;
	textColor?: string;
	indicatorColor?: string;
}

const CheckBox = ({
	options,
	firebaseMode,
	onClick,
	activeColor = 'indigo-600',
	inactiveColor = 'white/[0.03]',
	textColor = 'white',
	indicatorColor = 'indigo-400',
}: CheckBoxProps) => {
	return (
		<div className='grid grid-cols-2 gap-3'>
			{options.map((item) => {
				const active = firebaseMode === item.value;
				return (
					<button
						key={item.value}
						type='button'
						onClick={() => onClick(item.value as FirebaseMode)}
						className={`relative p-4 rounded-xl transition-all text-left
        ${active
								? `bg-[${activeColor}]/20`
								: `bg-${inactiveColor} hover:bg-white/[0.05]`
							}
        `}
						style={
							active
								? {
									backgroundColor: `color-mix(in srgb, ${activeColor} 20%, transparent)`,
								}
								: {}
						}
					>
						<div className='flex items-center justify-between'>
							<span className={`text-sm font-medium text-${textColor}`}>{item.label}</span>

							{/* indicator */}
							<div
								className='h-4 w-4 rounded-full flex items-center justify-center transition-all'
								style={
									active
										? {
											backgroundColor: indicatorColor,
										}
										: {
											backgroundColor: 'rgb(255 255 255 / 0.1)',
										}
								}
							>
								{active && (
									<div
										className='h-2 w-2 rounded-full'
										style={{ backgroundColor: inactiveColor === 'white/[0.03]' ? '#000' : '#fff' }}
									/>
								)}
							</div>
						</div>
					</button>
				);
			})}
		</div>
	);
};

export { CheckBox };
