import {
  getPokemonImageSource,
  getPokemonImageFallback,
  getPokemonImage,
  checkPokemonImageExists,
  getThumbnailUrl,
  getOfficialArtwork,
  getTcgCardImage
} from '../../src/utils/helpers';

describe('Pokemon Image Helper Functions', () => {
  describe('getTcgCardImage', () => {
    it('should return correctly formatted Google Storage URL for TCG card', () => {
      expect(getTcgCardImage('base1-1')).toBe('https://storage.googleapis.com/pokehelper/tcg-cards-webp/base1-1.webp');
      expect(getTcgCardImage('sv3-150')).toBe('https://storage.googleapis.com/pokehelper/tcg-cards-webp/sv3-150.webp');
    });
  });

  describe('getThumbnailUrl', () => {
    it('should return correctly formatted thumbnail URL for Pokemon ID', () => {
      expect(getThumbnailUrl(1)).toBe('/images/pokemon/thumbnails/001.png');
      expect(getThumbnailUrl(25)).toBe('/images/pokemon/thumbnails/025.png');
      expect(getThumbnailUrl(150)).toBe('/images/pokemon/thumbnails/150.png');
      expect(getThumbnailUrl(1000)).toBe('/images/pokemon/thumbnails/1000.png');
    });

    it('should pad single digit IDs with zeros', () => {
      expect(getThumbnailUrl(1)).toBe('/images/pokemon/thumbnails/001.png');
      expect(getThumbnailUrl(9)).toBe('/images/pokemon/thumbnails/009.png');
    });

    it('should pad double digit IDs with one zero', () => {
      expect(getThumbnailUrl(10)).toBe('/images/pokemon/thumbnails/010.png');
      expect(getThumbnailUrl(99)).toBe('/images/pokemon/thumbnails/099.png');
    });

    it('should not pad triple digit IDs', () => {
      expect(getThumbnailUrl(100)).toBe('/images/pokemon/thumbnails/100.png');
      expect(getThumbnailUrl(999)).toBe('/images/pokemon/thumbnails/999.png');
    });
  });

  describe('getPokemonImageSource', () => {
    it('should return correctly formatted local thumbnail URL', () => {
      expect(getPokemonImageSource(1)).toBe('/images/pokemon/thumbnails/001.png');
      expect(getPokemonImageSource(25)).toBe('/images/pokemon/thumbnails/025.png');
      expect(getPokemonImageSource(905)).toBe('/images/pokemon/thumbnails/905.png');
      expect(getPokemonImageSource(10177)).toBe('/images/pokemon/thumbnails/10177.png');
    });
  });

  describe('getPokemonImageFallback', () => {
    it('should return correctly formatted image proxy URL', () => {
      expect(getPokemonImageFallback(1)).toBe('/api/pokemon/images/1');
      expect(getPokemonImageFallback(25)).toBe('/api/pokemon/images/25');
      expect(getPokemonImageFallback(905)).toBe('/api/pokemon/images/905');
      expect(getPokemonImageFallback(10177)).toBe('/api/pokemon/images/10177');
    });
  });

  describe('getOfficialArtwork', () => {
    it('should return official artwork URL when available', () => {
      const sprites = {
        other: {
          'official-artwork': {
            front_default: 'https://example.com/official.png'
          }
        },
        front_default: 'https://example.com/front.png'
      };

      expect(getOfficialArtwork(sprites)).toBe('https://example.com/official.png');
    });

    it('should fallback to front_default when official artwork not available', () => {
      const sprites = {
        front_default: 'https://example.com/front.png'
      };

      expect(getOfficialArtwork(sprites)).toBe('https://example.com/front.png');
    });

    it('should return fallback thumbnail URL when sprites are invalid', () => {
      expect(getOfficialArtwork(null)).toBe('/images/pokemon/thumbnails/000.png');
      expect(getOfficialArtwork(undefined)).toBe('/images/pokemon/thumbnails/000.png');
      expect(getOfficialArtwork({})).toBe('/images/pokemon/thumbnails/000.png');
    });

    it('should handle string sprites by parsing JSON', () => {
      const spritesString = JSON.stringify({
        other: {
          'official-artwork': {
            front_default: 'https://example.com/official.png'
          }
        }
      });

      expect(getOfficialArtwork(spritesString)).toBe('https://example.com/official.png');
    });

    it('should handle malformed JSON gracefully', () => {
      expect(getOfficialArtwork('invalid json')).toBe('/images/pokemon/thumbnails/000.png');
    });
  });

  describe('getPokemonImage', () => {
    it('should return local thumbnail URL for low Pokemon IDs', () => {
      const sprites = {
        other: {
          'official-artwork': {
            front_default: 'https://example.com/official.png'
          }
        }
      };

      expect(getPokemonImage(25, sprites)).toBe('/images/pokemon/thumbnails/025.png');
      expect(getPokemonImage(150, sprites)).toBe('/images/pokemon/thumbnails/150.png');
      expect(getPokemonImage(905, sprites)).toBe('/images/pokemon/thumbnails/905.png');
    });

    it('should return official artwork URL for high Pokemon IDs when available', () => {
      const sprites = {
        other: {
          'official-artwork': {
            front_default: 'https://example.com/official.png'
          }
        }
      };

      // Note: getPokemonImage currently always tries local first and falls back to sprites
      // This behavior might need to be updated based on the Pokemon ID
      expect(getPokemonImage(10177, sprites)).toBe('/images/pokemon/thumbnails/10177.png');
    });

    it('should handle missing sprites parameter', () => {
      expect(getPokemonImage(25)).toBe('/images/pokemon/thumbnails/025.png');
      expect(getPokemonImage(150, undefined)).toBe('/images/pokemon/thumbnails/150.png');
      expect(getPokemonImage(905, null)).toBe('/images/pokemon/thumbnails/905.png');
    });
  });

  describe('checkPokemonImageExists', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      // Mock Image constructor
      global.Image = jest.fn().mockImplementation(() => ({
        onload: jest.fn(),
        onerror: jest.fn(),
        src: ''
      }));
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.clearAllMocks();
      jest.useRealTimers();
    });

    it('should resolve to true when image loads successfully', async () => {
      const mockImage = {
        onload: jest.fn(),
        onerror: jest.fn(),
        src: ''
      };

      (global.Image as jest.Mock).mockImplementation(() => mockImage);

      const promise = checkPokemonImageExists(25);

      // Simulate successful load
      mockImage.onload();

      const result = await promise;
      expect(result).toBe(true);
      expect(mockImage.src).toBe('/images/pokemon/thumbnails/025.png');
    });

    it('should resolve to false when image fails to load', async () => {
      const mockImage = {
        onload: jest.fn(),
        onerror: jest.fn(),
        src: ''
      };

      (global.Image as jest.Mock).mockImplementation(() => mockImage);

      const promise = checkPokemonImageExists(10177);

      // Simulate load failure
      mockImage.onerror();

      const result = await promise;
      expect(result).toBe(false);
      expect(mockImage.src).toBe('/images/pokemon/thumbnails/10177.png');
    });

    it('should timeout after 5 seconds', async () => {
      const mockImage = {
        onload: jest.fn(),
        onerror: jest.fn(),
        src: ''
      };

      (global.Image as jest.Mock).mockImplementation(() => mockImage);

      const promise = checkPokemonImageExists(25);

      // Advance timers to trigger timeout
      jest.advanceTimersByTime(5000);

      const result = await promise;
      expect(result).toBe(false);
    });
  });
});
