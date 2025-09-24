import CustomAdDashboard from '../../components/custom-ads/CustomAdDashboard';

export default function HostManageCampaignsPage() {
  return (
    <div className="space-y-8">
      <section>
        <CustomAdDashboard userRole="host" />
      </section>
    </div>
  );
}


