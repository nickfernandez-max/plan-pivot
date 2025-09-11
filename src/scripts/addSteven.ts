// Script to add Steven Nunnally to the database
// This should be run from the browser console or as a one-time script

import { createUser } from '@/utils/createUser';

export async function addStevenNunnally() {
  try {
    const result = await createUser({
      email: 'steven.nunnally@granstreet.com',
      password: 'ABCD1234',
      full_name: 'Steven Nunnally',
      role: 'editor' // Not admin as requested
    });

    if (result.error) {
      console.error('Failed to create Steven Nunnally:', result.error);
      return false;
    }

    console.log('Steven Nunnally created successfully:', result.data);
    return true;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

// Uncomment the line below to run immediately
// addStevenNunnally();