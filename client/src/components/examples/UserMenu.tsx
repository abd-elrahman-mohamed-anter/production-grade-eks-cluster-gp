import UserMenu from '../UserMenu';

export default function UserMenuExample() {
  return (
    <div className="flex justify-end p-4">
      <UserMenu 
        username="Admin User"
        onProfileClick={() => console.log('Profile clicked')}
        onApiKeysClick={() => console.log('API Keys clicked')}
      />
    </div>
  );
}
