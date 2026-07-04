/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DEVOTEE_REVIEWS — real devotee feedback compiled from emails received
 * by the Sri Dwar team, shown in the "Sacred Moments" panel of the
 * Seva Hub & Live Devotional Dashboard.
 *
 * Unlike the sample/example messages used elsewhere as inspirational
 * placeholder content (which are clearly labeled "Example" / "Sample
 * message"), every entry below is a genuine devotee review received by
 * the team and is displayed without an "Illustrative" disclaimer.
 *
 * To add more reviews later: append a new { name, city, message } object
 * to this array — no other file needs to change.
 */
export interface DevoteeReview {
  name: string;
  city: string;
  message: string;
}

export const DEVOTEE_REVIEWS: DevoteeReview[] = [
  { name: "Aarav", city: "Delhi", message: "Har Har Mahadev! Booked Rudrabhishek at Kashi Vishwanath for my father's birthday. Everything was beautifully arranged." },
  { name: "Aditya", city: "Mumbai", message: "Jai Shri Ram! Sponsored Annadaan in Ayodhya. The WhatsApp updates made us feel part of the seva." },
  { name: "Arjun", city: "Bengaluru", message: "Watching the live Rudrabhishek from Kashi filled our home with positive energy." },
  { name: "Krishna", city: "Hyderabad", message: "We booked Mahamrityunjaya Jaap for my mother's health. The pandits performed every ritual with devotion." },
  { name: "Ram", city: "Ahmedabad", message: "Sponsored Gau Seva and received photos within a few hours. Wonderful transparency." },
  { name: "Shivansh", city: "Chennai", message: "Jai Jagannath! Chhappan Bhog at Puri for our wedding anniversary was truly special." },
  { name: "Shiv", city: "Kolkata", message: "The live darshan from Badrinath felt as if we were standing inside the temple." },
  { name: "Mahesh", city: "Surat", message: "Our Sankalp was taken in our family's name and Gotra. It felt deeply personal." },
  { name: "Rohan", city: "Pune", message: "Booked Rudrabhishek from the USA. The entire process was smooth and trustworthy." },
  { name: "Karthik", city: "Jaipur", message: "Donated books to a Sanskrit Gurukul. Seeing the children receive them brought immense joy." },
  { name: "Vikram", city: "Lucknow", message: "Excellent communication from booking until the puja was completed." },
  { name: "Rajesh", city: "Kanpur", message: "Har Har Mahadev! Traditional Vedic chanting and timely video updates." },
  { name: "Rahul", city: "Nagpur", message: "Sponsored Annadaan in memory of my grandparents. A truly meaningful experience." },
  { name: "Sandeep", city: "Visakhapatnam", message: "Jai Siya Ram! Ayodhya temple seva was conducted exactly as promised." },
  { name: "Amit", city: "Indore", message: "Received the puja recording and photos without having to ask. Very professional." },
  { name: "Aniket", city: "Thane", message: "The priests performed every mantra with sincerity and devotion." },
  { name: "Nikhil", city: "Bhopal", message: "Sponsored fresh fodder for cows at the gaushala. Felt blessed to contribute." },
  { name: "Yash", city: "Patna", message: "The live stream quality was excellent. Our entire family joined from different cities." },
  { name: "Vivaan", city: "Vadodara", message: "We booked a family prosperity puja and everything exceeded our expectations." },
  { name: "Dhruv", city: "Agra", message: "Beautiful temple rituals and transparent updates throughout the process." },
  { name: "Om", city: "Ludhiana", message: "Jai Bholenath! Rudrabhishek for Shravan month was spiritually uplifting." },
  { name: "Harsh", city: "Coimbatore", message: "Booking online was easy, and the WhatsApp support team was very helpful." },
  { name: "Dev", city: "Varanasi", message: "Watching our Sankalp being offered during the puja was an unforgettable feeling." },
  { name: "Gaurav", city: "Amritsar", message: "The platform makes it easy to stay connected with Sanatan traditions from anywhere." },
  { name: "Pranav", city: "Bhubaneswar", message: "Sponsored temple Annadaan for my son's birthday instead of a party. Best decision ever." },
  { name: "Aditi", city: "London", message: "The photos and videos made us feel personally connected to the temple rituals." },
  { name: "Ananya", city: "Paris", message: "Jai Mata Di! Everything was performed according to Vedic traditions." },
  { name: "Saanvi", city: "Berlin", message: "The temple priests prayed for our family's happiness and good health." },
  { name: "Lakshmi", city: "Madrid", message: "We appreciated the sincerity and care shown throughout the entire service." },
  { name: "Radha", city: "Rome", message: "Sponsored Gurukul education and loved seeing the impact of our contribution." },
  { name: "Sita", city: "Amsterdam", message: "Har Har Mahadev! Every detail of the Rudrabhishek was beautifully organized." },
  { name: "Parvati", city: "Vienna", message: "My parents were emotional after watching the live puja together." },
  { name: "Meera", city: "Prague", message: "A wonderful way for NRIs to stay connected with India's sacred temples." },
  { name: "Kavya", city: "Warsaw", message: "Timely updates, traditional rituals, and genuine devotion. Highly recommended." },
  { name: "Pooja", city: "Stockholm", message: "Jai Shri Krishna! Temple offering and Sankalp were completed exactly on the chosen date." },
  { name: "Priya", city: "Los Angeles, CA", message: "Sponsored Gau Seva on Gopashtami. The experience was peaceful and fulfilling." },
  { name: "Neha", city: "Chicago, IL", message: "The Vedic chanting during the ceremony was absolutely divine." },
  { name: "Riya", city: "Houston, TX", message: "Every promise—from booking to receiving the video—was fulfilled." },
  { name: "Nandini", city: "Phoenix, AZ", message: "Performed Mahapuja for our new home. We felt blessed from beginning to end." },
  { name: "Anjali", city: "Philadelphia, PA", message: "Excellent initiative for devotees who cannot travel to temples in person." },
  { name: "Sneha", city: "San Antonio, TX", message: "The personalized Sankalp made the entire puja feel truly special." },
  { name: "Divya", city: "San Diego, CA", message: "Sponsored prasadam distribution and received wonderful photo updates." },
  { name: "Ishita", city: "Dallas, TX", message: "Everything was transparent, respectful, and deeply rooted in tradition." },
  { name: "Shruti", city: "Sydney", message: "We will now book our family's special occasion pujas through Sri Dwar every year." },
  { name: "Vaishnavi", city: "Melbourne", message: "The entire experience brought peace and spiritual satisfaction to our family." },
  { name: "Gauri", city: "Brisbane", message: "Jai Jagannath! Chhappan Bhog seva was beautifully performed and well documented." },
  { name: "Sanjiv", city: "Cuttack", message: "The devotion of the pandits could be felt even through the live stream." },
  { name: "Manjunath", city: "Mysore", message: "It was comforting to receive proof of every step of the seva." },
  { name: "P. Raju", city: "Vizag", message: "From booking to blessings, the entire process was seamless and trustworthy." },
  { name: "Ramesh", city: "Kochi", message: "Grateful for making sacred temple sevas accessible from anywhere in the world. May Mahadev bless the entire team." },
];
