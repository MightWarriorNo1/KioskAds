import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, DollarSign, FileText, MapPin, Save, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { CampaignService, Kiosk } from '../../services/campaignService';
import EnhancedKioskSelection from '../client/EnhancedKioskSelection';
import { VolumeDiscountService, CampaignPricing } from '../../services/volumeDiscountService';
import { validateFile, ValidationResult } from '../../utils/fileValidation';
import { MediaService } from '../../services/mediaService';
import { BillingService } from '../../services/billingService';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useElements, useStripe, PaymentElement } from '@stripe/react-stripe-js';

export default function CreateCampaign() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const { addNotification } = useNotification();

	const [kiosks, setKiosks] = useState<Kiosk[]>([]);
	const [selectedKioskIds, setSelectedKioskIds] = useState<string[]>([]);
	const [isLoadingKiosks, setIsLoadingKiosks] = useState<boolean>(true);
	const [submitting, setSubmitting] = useState<boolean>(false);
	const [pricing, setPricing] = useState<CampaignPricing | null>(null);

	// Media upload state
	const [file, setFile] = useState<File | null>(null);
	const [filePreview, setFilePreview] = useState<string | null>(null);
	const [fileValidation, setFileValidation] = useState<ValidationResult | null>(null);
	const [uploadingAsset, setUploadingAsset] = useState<boolean>(false);
	const [showPayment, setShowPayment] = useState<boolean>(false);
	const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
	const [pendingCampaignPayload, setPendingCampaignPayload] = useState<any | null>(null);
	const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

	const [form, setForm] = useState({
		name: '',
		description: '',
		startDate: '',
		endDate: '',
		budget: '' as unknown as number | string,
		dailyBudget: '' as unknown as number | string
	});

	useEffect(() => {
		const load = async () => {
			try {
				setIsLoadingKiosks(true);
				const data = await CampaignService.getAvailableKiosks();
				setKiosks(data);
			} catch (e) {
				console.error(e);
				addNotification('error', 'Error', 'Failed to load kiosks');
			} finally {
				setIsLoadingKiosks(false);
			}
		};
		load();
	}, [addNotification]);

	const selectedKiosks = useMemo(() => kiosks.filter(k => selectedKioskIds.includes(k.id)), [kiosks, selectedKioskIds]);

	const totalSlots = useMemo(() => selectedKioskIds.length, [selectedKioskIds]);

	const canSubmit = useMemo(() => {
		return (
			!!user?.id &&
			form.name.trim().length > 0 &&
			form.startDate &&
			form.endDate &&
			new Date(form.startDate) <= new Date(form.endDate) &&
			selectedKioskIds.length > 0 &&
			!!file && !!fileValidation?.isValid
		);
	}, [form.name, form.startDate, form.endDate, selectedKioskIds, user?.id, file, fileValidation?.isValid]);

	const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const f = event.target.files?.[0] || null;
		setFile(f);
		setFileValidation(null);
		setFilePreview(null);
		if (!f) return;
		try {
			const validation = await validateFile(f);
			if (!validation.isValid) {
				addNotification('error', 'File Validation Failed', validation.errors.join('. '));
				setFileValidation(validation);
				return;
			}
			setFileValidation(validation);
			const reader = new FileReader();
			reader.onload = (e) => setFilePreview(e.target?.result as string);
			reader.readAsDataURL(f);
			addNotification('success', 'File Validated', 'File meets all requirements and is ready for upload');
		} catch (err) {
			console.error('Validation error:', err);
			addNotification('error', 'Validation Error', 'Failed to validate file. Please try again.');
		}
	};

	const handleSubmit = async () => {
		if (!user?.id) return;
		if (!canSubmit) {
			addNotification('error', 'Validation', 'Please complete the form, select kiosks, and upload a valid file');
			return;
		}

		setSubmitting(true);
		try {
			// Upload media first with same flow as client portal
			setUploadingAsset(true);
			const media = await MediaService.uploadMedia(file as File, fileValidation as ValidationResult, user.id);
			setUploadingAsset(false);

			const calculatedPricing = pricing || (selectedKiosks.length > 0 ? await VolumeDiscountService.calculateCampaignPricing(selectedKiosks) : null);

			const totalAmount = calculatedPricing?.totalFinalPrice ?? Number(form.budget) ?? 0;
			if (!totalAmount || totalAmount <= 0) {
				throw new Error('Invalid total amount for payment');
			}

			// Initialize Stripe payment intent
			const intent = await BillingService.createPaymentIntent({
				amount: Math.round(totalAmount * 100),
				currency: 'usd',
				metadata: {
					purpose: 'host_campaign',
					user_id: user.id,
					campaign_name: form.name
				}
			});
			if (!intent?.clientSecret) {
				throw new Error('Unable to start payment');
			}
			setPaymentClientSecret(intent.clientSecret);
			setPendingCampaignPayload({
				name: form.name,
				description: form.description || undefined,
				start_date: form.startDate,
				end_date: form.endDate,
				budget: Number(form.budget) || totalAmount,
				daily_budget: form.dailyBudget ? Number(form.dailyBudget) : undefined,
				total_slots: totalSlots,
				total_cost: totalAmount,
				user_id: user.id,
				kiosk_ids: selectedKioskIds,
				selected_kiosk_ids: selectedKioskIds,
				volume_discount_applied: calculatedPricing?.totalDiscountAmount ?? 0,
				total_discount_amount: calculatedPricing?.totalDiscountAmount ?? 0,
				media_asset_id: media.id
			});
			setShowPayment(true);
		} catch (e) {
			console.error(e);
			addNotification('error', 'Error', e instanceof Error ? e.message : 'Failed to create campaign');
		} finally {
			setSubmitting(false);
		}
	};

	const handlePaymentSuccess = async () => {
		if (!pendingCampaignPayload || !user?.id) return;
		try {
			const result = await CampaignService.createCampaign(pendingCampaignPayload);
			if (!result) throw new Error('Campaign creation failed');
			// Record payment as succeeded for history
			await BillingService.createPaymentRecord({
				user_id: user.id,
				campaign_id: result.id,
				amount: pendingCampaignPayload.total_cost,
				status: 'succeeded',
				description: `Host campaign payment: ${pendingCampaignPayload.name}`
			});
			addNotification('success', 'Campaign Created', 'Payment received. Your campaign has been created.');
			navigate('/host/ads');
		} catch (e) {
			console.error(e);
			addNotification('error', 'Error', e instanceof Error ? e.message : 'Failed to finalize campaign after payment');
		} finally {
			setShowPayment(false);
			setPaymentClientSecret(null);
			setPendingCampaignPayload(null);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Create Campaign</h1>
					<p className="mt-1 text-gray-600 dark:text-gray-400">Select kiosks, set schedule, upload media, and create an ad campaign for other kiosks.</p>
				</div>
			</div>

			<Card className="p-6">
				<div className="grid md:grid-cols-2 gap-6">
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Campaign Name
						</label>
						<input
							type="text"
							value={form.name}
							onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
							placeholder="Summer Promo"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Description
						</label>
						<textarea
							value={form.description}
							onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
							rows={3}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
							placeholder="Optional notes"
						/>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
							<Calendar className="h-4 w-4" /> Start Date
						</label>
						<input
							type="date"
							value={form.startDate}
							onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
						/>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
							<Calendar className="h-4 w-4" /> End Date
						</label>
						<input
							type="date"
							value={form.endDate}
							onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
						/>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
							<DollarSign className="h-4 w-4" /> Budget (optional)
						</label>
						<input
							type="number"
							min="0"
							value={form.budget as any}
							onChange={(e) => setForm(prev => ({ ...prev, budget: e.target.value }))}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
							placeholder="Auto from pricing"
						/>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
							<DollarSign className="h-4 w-4" /> Daily Budget (optional)
						</label>
						<input
							type="number"
							min="0"
							value={form.dailyBudget as any}
							onChange={(e) => setForm(prev => ({ ...prev, dailyBudget: e.target.value }))}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
							placeholder="Optional"
						/>
					</div>
				</div>
			</Card>

			{/* Media Upload */}
			<Card className="p-6">
				<h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Upload className="h-5 w-5" /> Upload Media</h3>
				<div className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${fileValidation && !fileValidation.isValid ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : filePreview ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'}`}
					onClick={() => document.getElementById('host-create-campaign-file')?.click()}
				>
					<input id="host-create-campaign-file" type="file" accept="image/jpeg,image/png,video/mp4" onChange={handleFileSelect} className="hidden" />
					{fileValidation && !fileValidation.isValid ? (
						<div className="space-y-2">
							<AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
							<div className="text-sm text-red-700 dark:text-red-300">
								{fileValidation.errors.join('. ')}
							</div>
						</div>
					) : filePreview ? (
						<div className="space-y-3">
							{(file?.type.startsWith('image/')) ? (
								<img src={filePreview} alt="Preview" className="max-h-64 mx-auto rounded-lg shadow" />
							) : (
								<video src={filePreview} controls className="max-h-64 mx-auto rounded-lg shadow" />
							)}
							<div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
								<CheckCircle className="h-5 w-5" />
								<span className="font-medium">File validated</span>
							</div>
						</div>
					) : (
						<div className="space-y-2">
							<Upload className="h-8 w-8 text-gray-400 mx-auto" />
							<div className="text-sm text-gray-600 dark:text-gray-400">Click to upload or drag and drop</div>
							<div className="text-xs text-gray-500 dark:text-gray-400">Images (JPG, PNG) or Videos (MP4)</div>
							<div className="text-xs text-gray-400 dark:text-gray-500">Images: 10MB max • Videos: 500MB max • 9:16 aspect ratio required • 1080×1920 or 2160×3840 • Videos ≤ 15s</div>
						</div>
					)}
				</div>
			</Card>

			<Card className="p-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold flex items-center gap-2"><MapPin className="h-5 w-5" /> Select Kiosks</h3>
				</div>
				{isLoadingKiosks ? (
					<div className="text-sm text-gray-600 dark:text-gray-400">Loading kiosks...</div>
				) : (
					<EnhancedKioskSelection
						kiosks={kiosks}
						selectedKioskIds={selectedKioskIds}
						onSelectionChange={setSelectedKioskIds}
						onPricingChange={setPricing}
					/>
				)}
			</Card>

			{pricing && (
				<Card className="p-6">
					<h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5" /> Pricing Summary</h3>
					<div className="grid md:grid-cols-3 gap-4 mt-4">
						<div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
							<div className="text-sm text-gray-600 dark:text-gray-400">Subtotal</div>
							<div className="text-xl font-bold">${pricing.totalBasePrice.toFixed(2)}</div>
						</div>
						<div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
							<div className="text-sm text-gray-600 dark:text-gray-400">Discounts</div>
							<div className="text-xl font-bold text-green-600">-${pricing.totalDiscountAmount.toFixed(2)}</div>
						</div>
						<div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
							<div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
							<div className="text-xl font-bold text-blue-600">${pricing.totalFinalPrice.toFixed(2)}</div>
						</div>
					</div>
				</Card>
			)}

			<div className="flex justify-end gap-3">
				<Button variant="secondary" onClick={() => navigate('/host/ads')}>
					Cancel
				</Button>
				<Button onClick={handleSubmit} disabled={!canSubmit || uploadingAsset} loading={submitting || uploadingAsset}>
					<Save className="h-4 w-4 mr-2" /> Create Campaign
				</Button>
			</div>

			{showPayment && paymentClientSecret && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6">
						<h3 className="text-lg font-semibold mb-4">Confirm Payment</h3>
						<Elements stripe={loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string)} options={{ clientSecret: paymentClientSecret }}>
							<HostStripePaymentForm
								message={paymentMessage}
								setMessage={setPaymentMessage}
								onCancel={() => { setShowPayment(false); setPaymentClientSecret(null); }}
								onSuccess={handlePaymentSuccess}
							/>
						</Elements>
					</div>
				</div>
			)}
		</div>
	);
}


function HostStripePaymentForm(props: {
    message: string | null;
    setMessage: (m: string | null) => void;
    onCancel: () => void;
    onSuccess: () => void;
}) {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setIsProcessing(true);
        props.setMessage(null);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin + '/host/ads',
            },
            redirect: 'if_required',
        });

        if (error) {
            props.setMessage(error.message || 'Payment failed.');
            setIsProcessing(false);
            return;
        }

        if (paymentIntent && paymentIntent.status === 'succeeded') {
            props.setMessage('Payment succeeded!');
            await Promise.resolve(props.onSuccess());
        }
        setIsProcessing(false);
    };

    return (
        <form onSubmit={handleConfirm} className="space-y-4">
            <PaymentElement />
            {props.message && (
                <div className="text-sm text-red-600 dark:text-red-400">{props.message}</div>
            )}
            <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" type="button" onClick={props.onCancel}>
                    Cancel
                </Button>
                <Button type="submit" loading={isProcessing}>
                    Pay and Create
                </Button>
            </div>
        </form>
    );
}
