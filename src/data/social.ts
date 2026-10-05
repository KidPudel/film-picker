/**
 * Demo social circle. Everything here is fictional and is labelled «демо» in the UI.
 * It shows how ratings from people you trust sit next to public ratings.
 */
export interface Friend {
  id: string;
  name: string;
  circle: 'Семья' | 'Друзья';
  hue: number; // avatar tint
}

export const FRIENDS: Friend[] = [
  { id: 'mama', name: 'Мама', circle: 'Семья', hue: 28 },
  { id: 'timur', name: 'Тимур', circle: 'Семья', hue: 200 },
  { id: 'katya', name: 'Катя', circle: 'Друзья', hue: 330 },
  { id: 'artem', name: 'Артём', circle: 'Друзья', hue: 150 },
  { id: 'lena', name: 'Лена', circle: 'Друзья', hue: 265 },
];
export const FRIEND_BY_ID = new Map(FRIENDS.map((f) => [f.id, f]));

export interface FriendTake {
  friend: string;
  score: number; // из 10
  note?: string;
  /** Friend explicitly pointed this film at you or a group. */
  recommendsTo?: string;
}

export const FRIEND_TAKES: Record<number, FriendTake[]> = {
  714248: [
    { friend: 'mama', score: 9, note: 'Плакала, но светло' },
    { friend: 'katya', score: 10, note: 'Смотрите все вместе', recommendsTo: 'Семья' },
  ],
  425400: [
    { friend: 'artem', score: 10, note: 'После финала молчали полчаса' },
    { friend: 'lena', score: 9 },
  ],
  677566: [{ friend: 'lena', score: 8, note: 'Красиво до мурашек' }],
  1040690: [{ friend: 'timur', score: 9, note: 'Как будто про наш двор', recommendsTo: 'вам' }],
  1347315: [{ friend: 'mama', score: 8, note: 'Захотелось в букинистический' }],
  425: [{ friend: 'artem', score: 8 }],
  5237750: [{ friend: 'katya', score: 9, note: 'Очень добрый фильм' }],
};
